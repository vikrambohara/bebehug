Dr.Bohrras Baby Care — enhanced online-store starter

Includes the refreshed pastel homepage, separate detail pages for all three product ranges, shared cart storage, checkout page, WhatsApp inquiry/order flow, Google Sheets Apps Script template, and setup guides.

Pages
- index.html — homepage and product cards
- feel-dry.html — Feel Dry detail page
- double-colour-rubber-sheet.html — double-colour rubber sheet detail page
- magic-mat.html — Magic Mat detail page
- checkout.html — delivery details and order inquiry checkout

Business contact details are already configured: Boharras Inc., No. 309, Mint Street, Chennai - 600003, Tamil Nadu, India; +91 98400 17107. WhatsApp inquiry links use +919840017107.

Prices currently configured in site fallback
Feel Dry: S ₹165, M ₹300, L ₹545, XL ₹1,200
Double Colour Rubber Sheet: 90 × 100 cm ₹450, 90 × 200 cm ₹800, 90 × 300 cm ₹1,050
Magic Mat: 90 × 90 cm ₹350, 90 × 180 cm ₹550

Google Sheets: See GOOGLE_SHEETS_SETUP.txt and google-sheets-apps-script.gs. The Apps Script template is included, but automatic live catalogue loading is not yet connected. Deploy the Apps Script as a Web App, paste its URL into config.js, then wire/test the catalogue loader before relying on Sheets changes.

Payments: The store has a Razorpay account, but online payments are not live in this ZIP. Before activation, configure Razorpay Key ID in config.js and put RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET only in Cloudflare Pages > Settings > Environment variables. A secure server-side order-creation and signature-verification function, delivery/shipping rules, order records, and successful test/live transactions are still required. Never put the Razorpay Key Secret in frontend files or Google Sheets. Do not advertise online payment as active until test and live transactions have been verified.

Cloudflare Pages: because the project contains Pages Functions under functions/api, deploy using a connected Git repository or Wrangler; dashboard drag-and-drop is for static assets and will not deploy these functions. The checkout currently sends order inquiries to WhatsApp. It does not yet store orders in a database, issue invoices, or complete online payments.


Razorpay + Cloudflare Pages Functions (integration scaffold)
- Secure server endpoints are in functions/api/create-order.js and functions/api/verify-payment.js. Deploy the site to Cloudflare Pages so these functions run; they will not work when opening index.html directly from your computer.
- In Cloudflare Pages > Settings > Environment variables, add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET (use Test Mode keys first), PAYMENTS_ENABLED=false, and SHIPPING_CHARGE_RUPEES only after you decide your delivery-charge policy.
- After configuring delivery charges and testing, set PAYMENTS_ENABLED=true in the relevant environment. Use live Razorpay keys only after test payments and website checks are complete. Never put the Key Secret in config.js, HTML, JavaScript served to visitors, or Google Sheets.
- The server recalculates prices from the catalogue rather than trusting browser-sent prices, creates a Razorpay order, verifies the checkout signature, and checks that Razorpay reports the payment as captured.
- Before accepting real orders, test both success and failure cases, decide delivery charges (the shipping amount is added to the payment total), and confirm how paid orders will be fulfilled and reconciled in the Razorpay dashboard. This starter does not yet write a permanent order record into Google Sheets or a database.
- The Google Sheets product catalogue is still a separate setup task: deploy google-sheets-apps-script.gs and connect its Web App URL in config.js; product rendering needs to be completed and tested before sheet edits dynamically update all pages.


CLOUDFLARE DEPLOYMENT CHECKLIST
1. Extract this ZIP. Create a private/public GitHub repository and upload the contents of the drbohrras_baby_store folder (the files inside the folder, including functions/).
2. In Cloudflare dashboard, open Workers & Pages > Create > Pages > Connect to Git, choose the repository, and configure the project. For plain HTML/CSS/JS, use no build command and set the build output directory to / (repository root).
3. Deploy and open the *.pages.dev URL. Test every product page, images, cart, checkout and WhatsApp links on phone and desktop.
4. In Settings > Variables and Secrets, add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET as secrets; add PAYMENTS_ENABLED=false and SHIPPING_CHARGE_RUPEES=0. Keep payments disabled until checkout is wired to the functions and verified with Razorpay test mode.
5. Add the public Razorpay TEST Key ID to config.js only. Never put RAZORPAY_KEY_SECRET in config.js, HTML, JavaScript sent to the browser, Google Sheets or GitHub.
6. Google Sheets is not live-connected yet: deploy google-sheets-apps-script.gs as a Web App, set appropriate access, copy its URL into config.js, and then implement/test the website fetch mapping.
7. Add your custom domain in Cloudflare Pages only after the *.pages.dev preview is tested. Before accepting real orders, publish shipping/returns/privacy/terms policies and verify the business/payment setup.
