name: Macro Indicators Sync

on:
  schedule:
    - cron: '0 5 * * *'
  workflow_dispatch:

jobs:
  scrape-macro:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm install

      - name: Run macro scraper
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: node src/pages/PricesPage/scripts/macro-sync.mjs
