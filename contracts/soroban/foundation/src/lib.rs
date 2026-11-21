#![no_std]

use soroban_sdk::{contract, contractimpl};

#[contract]
pub struct WalletFoundation;

#[contractimpl]
impl WalletFoundation {
    pub fn version() -> u32 {
        1
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::Env;

    #[test]
    fn returns_foundation_version() {
        let env = Env::default();
        let address = env.register(WalletFoundation, ());
        assert_eq!(WalletFoundationClient::new(&env, &address).version(), 1);
    }
}
