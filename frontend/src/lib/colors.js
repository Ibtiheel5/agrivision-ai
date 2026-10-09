/** Une couleur stable par classe (angle d'or pour bien espacer les teintes). */
export function classColor(classId) {
  return `hsl(${Math.round((classId * 137.508) % 360)} 70% 42%)`;
}
