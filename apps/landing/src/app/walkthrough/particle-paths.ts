const outlines = [
  "M26 45H134Q145 45 145 56V104Q145 115 134 115H26Q15 115 15 104V56Q15 45 26 45Z M15 64H145 M31 88H53 M31 100H66",
  "M49 72V51A31 31 0 0 1 111 51V72 M46 72H114Q124 72 124 82V124Q124 134 114 134H46Q36 134 36 124V82Q36 72 46 72Z M80 96V113",
  "M23 30H42L57 101H123L140 47H46 M61 101L55 116H126 M75 127a8 8 0 1 0 0 .1 M120 127a8 8 0 1 0 0 .1 M79 74l13 13 22-24",
  "M37 20H122V141L110 131 100 141 90 131 80 141 70 131 60 141 50 131 37 141V20Z M55 49H104 M55 70H104 M55 91H88 M91 113L99 121 111 108",
] as const;

export function sampleOutline(index: number, amount: number) {
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", outlines[index] ?? outlines[0]);
  const length = path.getTotalLength();
  return Array.from({ length: amount }, (_, position) => path.getPointAtLength(position * length / amount));
}
