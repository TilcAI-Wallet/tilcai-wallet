const outlines = [
  "M23 48h106a10 10 0 0 1 10 10v55a10 10 0 0 1-10 10H23a10 10 0 0 1-10-10V58a10 10 0 0 1 10-10ZM22 48l9-14a8 8 0 0 1 8-4l85 11a8 8 0 0 1 7 7M139 74h-22a13 13 0 0 0 0 26h22m-20-13a3.5 3.5 0 1 0 .001 0M27 105V64h78",
  "M48 69V49a32 32 0 0 1 64 0v20m-53 0V49a21 21 0 0 1 42 0v20M46 69h68a10 10 0 0 1 10 10v44a10 10 0 0 1-10 10H46a10 10 0 0 1-10-10V79a10 10 0 0 1 10-10Zm29 31a8 8 0 1 1 10 0v14H75Z",
  "M41 50h78l13 76a8 8 0 0 1-8 9H36a8 8 0 0 1-8-9Zm17 14V43a22 22 0 0 1 44 0v21M58 94l14 14 29-29M34 124h92",
  "M34 23h92v115l-11-9-12 9-12-9-11 9-11-9-12 9-12-9-11 9V23Zm15 18h62M49 60h27m19 0h16M49 75h27m19 0h16M49 91h62m-25 18 8 8 16-17M49 113h23",
] as const;

export function sampleOutline(index: number, amount: number) {
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", outlines[index] ?? outlines[0]);
  const length = path.getTotalLength();
  return Array.from({ length: amount }, (_, position) => {
    const { x, y } = path.getPointAtLength(position * length / amount);
    return { x, y };
  });
}
