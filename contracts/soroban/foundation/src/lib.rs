#![no_std]

use soroban_sdk::{contract, contracterror, contractimpl, contracttype, token, Address, Env};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Policy {
    pub owner: Address,
    pub agent: Address,
    pub asset: Address,
    pub recipient: Address,
    pub max_per_payment: i128,
    pub limit: i128,
    pub spent: i128,
    pub frozen: bool,
}

#[contracttype]
enum Key {
    Policy,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    InvalidAmount = 1,
    LimitExceeded = 2,
    Frozen = 3,
    InvalidPolicy = 4,
}

#[contract]
pub struct WalletFoundation;

#[contractimpl]
impl WalletFoundation {
    /// Creates a restricted contract-held balance; amounts are token atomic units.
    pub fn __constructor(
        env: Env,
        owner: Address,
        agent: Address,
        asset: Address,
        recipient: Address,
        max_per_payment: i128,
        limit: i128,
    ) {
        owner.require_auth();
        if max_per_payment <= 0 || limit < 0 {
            panic_with_error!(&env, Error::InvalidPolicy);
        }
        let policy = Policy {
            owner,
            agent,
            asset,
            recipient,
            max_per_payment,
            limit,
            spent: 0,
            frozen: false,
        };
        env.storage().instance().set(&Key::Policy, &policy);
    }

    pub fn version() -> u32 {
        1
    }

    pub fn policy(env: Env) -> Policy {
        env.storage().instance().get(&Key::Policy).unwrap()
    }

    /// The agent can only transfer the configured token to the configured recipient.
    pub fn spend(env: Env, amount: i128) -> Result<(), Error> {
        let mut policy = Self::policy(env.clone());
        policy.agent.require_auth();
        if policy.frozen {
            return Err(Error::Frozen);
        }
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        if amount > policy.max_per_payment {
            return Err(Error::LimitExceeded);
        }
        let new_spent = policy
            .spent
            .checked_add(amount)
            .ok_or(Error::LimitExceeded)?;
        if new_spent > policy.limit {
            return Err(Error::LimitExceeded);
        }
        policy.spent = new_spent;
        env.storage().instance().set(&Key::Policy, &policy);
        token::Client::new(&env, &policy.asset).transfer(
            &env.current_contract_address(),
            &policy.recipient,
            &amount,
        );
        Ok(())
    }

    /// Only the owner can change policy. Accumulated spend is never reset.
    pub fn set_policy(
        env: Env,
        agent: Address,
        recipient: Address,
        max_per_payment: i128,
        limit: i128,
        frozen: bool,
    ) -> Result<(), Error> {
        let mut policy = Self::policy(env.clone());
        policy.owner.require_auth();
        if max_per_payment <= 0 || limit < policy.spent {
            return Err(Error::InvalidPolicy);
        }
        policy.agent = agent;
        policy.recipient = recipient;
        policy.max_per_payment = max_per_payment;
        policy.limit = limit;
        policy.frozen = frozen;
        env.storage().instance().set(&Key::Policy, &policy);
        Ok(())
    }

    /// Owner-only recovery of the configured asset, independent of agent budget.
    pub fn withdraw(env: Env, to: Address, amount: i128) -> Result<(), Error> {
        let policy = Self::policy(env.clone());
        policy.owner.require_auth();
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        token::Client::new(&env, &policy.asset).transfer(
            &env.current_contract_address(),
            &to,
            &amount,
        );
        Ok(())
    }
}

use soroban_sdk::panic_with_error;

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::Address as _;

    #[test]
    fn payment_limit_and_policy_rotation() {
        let env = Env::default();
        env.mock_all_auths();
        let owner = Address::generate(&env);
        let agent = Address::generate(&env);
        let next_agent = Address::generate(&env);
        let recipient = Address::generate(&env);
        let token_admin = Address::generate(&env);
        let asset = env
            .register_stellar_asset_contract_v2(token_admin)
            .address();
        let id = env.register(
            WalletFoundation,
            (
                &owner,
                &agent,
                &asset,
                &recipient,
                5_000_000_i128,
                5_000_000_i128,
            ),
        );
        let wallet = WalletFoundationClient::new(&env, &id);
        let token = token::Client::new(&env, &asset);
        token::StellarAssetClient::new(&env, &asset).mint(&id, &200_000_000);
        wallet.spend(&5_000_000);
        assert_eq!(token.balance(&id), 195_000_000);
        assert_eq!(token.balance(&recipient), 5_000_000);
        assert_eq!(wallet.try_spend(&1), Err(Ok(Error::LimitExceeded)));
        wallet.set_policy(&next_agent, &recipient, &5_000_000, &10_000_000, &false);
        assert_eq!(wallet.policy().spent, 5_000_000);
        wallet.spend(&5_000_000);
        assert_eq!(wallet.policy().spent, 10_000_000);
        wallet.set_policy(&next_agent, &recipient, &5_000_000, &10_000_000, &true);
        assert_eq!(wallet.try_spend(&1), Err(Ok(Error::Frozen)));
    }

    #[test]
    fn authorization_and_failed_transfer_do_not_consume_budget() {
        let env = Env::default();
        env.mock_all_auths();
        let owner = Address::generate(&env);
        let agent = Address::generate(&env);
        let recipient = Address::generate(&env);
        let admin = Address::generate(&env);
        let asset = env.register_stellar_asset_contract_v2(admin).address();
        let id = env.register(
            WalletFoundation,
            (
                &owner,
                &agent,
                &asset,
                &recipient,
                5_000_000_i128,
                5_000_000_i128,
            ),
        );
        let wallet = WalletFoundationClient::new(&env, &id);
        // No funds: token failure must roll back the preceding counter update.
        assert!(wallet.try_spend(&1).is_err());
        assert_eq!(wallet.policy().spent, 0);
        token::StellarAssetClient::new(&env, &asset).mint(&id, &5_000_000);
        // No signature should authorize either spending or changing the policy.
        assert!(wallet.mock_auths(&[]).try_spend(&1).is_err());
        assert!(wallet
            .mock_auths(&[])
            .try_set_policy(&agent, &recipient, &5_000_000, &5_000_000, &false)
            .is_err());
        assert_eq!(wallet.policy().spent, 0);
        wallet.mock_all_auths().spend(&1);
        assert_eq!(env.auths()[0].0, agent);
        wallet
            .mock_all_auths()
            .set_policy(&agent, &recipient, &5_000_000, &5_000_000, &false);
        assert_eq!(env.auths()[0].0, owner);
        assert_eq!(wallet.try_spend(&0), Err(Ok(Error::InvalidAmount)));
        assert_eq!(wallet.try_spend(&-1), Err(Ok(Error::InvalidAmount)));
    }
}
