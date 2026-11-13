export const samples = {
  search: {
    label: 'Search a catalogue', mode: 'html', origin: 'https://shop.example.com',
    source: `<form id="search" action="/search" method="get">
  <label>Find a product</label>
  <input name="query" type="search" required>
  <button type="submit">Search</button>
</form>`,
  },
  signup: {
    label: 'Subscribe to updates', mode: 'html', origin: 'https://shop.example.com',
    source: `<form id="subscribe" action="/subscribe" method="post">
  <label>Your email</label>
  <input name="email" type="email" required>
  <button type="submit">Subscribe</button>
</form>`,
  },
  contract: {
    label: 'Review an explicit contract', mode: 'panel', origin: 'https://shop.example.com',
    source: JSON.stringify({ panel: 'hardwire.panel/1', origin: 'https://shop.example.com',
      title: 'Example shop contract', ports: [
        { id: 'search', kind: 'read', summary: 'Search the product catalogue.', endpoint: '/search',
          parameters: { properties: { query: { type: 'string' } }, required: ['query'] } },
        { id: 'delete-account', kind: 'destructive', confirmation: 'owner',
          summary: 'Delete an account after owner approval.',
          parameters: { properties: { accountId: { type: 'string' } }, required: ['accountId'] } },
      ] }, null, 2),
  },
  empty: {
    label: 'A page with no supported actions', mode: 'html', origin: 'https://shop.example.com',
    source: '<main><h1>Our catalogue</h1><p>This static capture contains no form or structured search action.</p></main>',
  },
};
