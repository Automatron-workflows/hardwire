// Application owned fake data shared by the two consumer demonstrations.
export const catalogue = Object.freeze([
  Object.freeze({ id: 'lamp-1', name: 'Desk lamp' }),
  Object.freeze({ id: 'chair-1', name: 'Reading chair' }),
]);

export function searchCatalogue({ query }) {
  return catalogue.filter(item => item.name.toLowerCase().includes(query.toLowerCase()))
    .map(item => ({ ...item }));
}
