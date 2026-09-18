name: Macro Indicators Sync

on:
  schedule:
    # Запуск каждый день в 05:00 UTC
    - cron: '0 5 * * *'
  workflow_dispatch: # Позволяет запускать скрипт вручную кнопкой "Run workflow"

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
          # Секрет базы данных берется из настроек репозитория (Settings -> Secrets)
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: node src/pages/PricesPage/scripts/macro-sync.mjs

