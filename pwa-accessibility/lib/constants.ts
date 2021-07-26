const NON_HEADLESS_CONFIG = {
  args: [
    '--ignore-certificate-errors',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--window-size=1920,1080',
    "--disable-accelerated-2d-canvas",
    "--disable-gpu"],
  ignoreHTTPSErrors: true,
  headless: false,
  defaultViewport: null
};

const HEADLESS_CONFIG = {
  args: [
    '--ignore-certificate-errors',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--window-size=1920,1080',
    "--disable-accelerated-2d-canvas",
    "--disable-gpu"],
  ignoreHTTPSErrors: true,
  headless: true,
  defaultViewport: null
};

const TEST_PAGE_URL = 'http://localhost:3000';

module.exports = {
  NON_HEADLESS_CONFIG,
  HEADLESS_CONFIG,
  TEST_PAGE_URL
};
