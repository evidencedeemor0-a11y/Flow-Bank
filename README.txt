FLOW WALLET
====================
Files:
- index.html
- style.css
- script.js
- manifest.json

DESIGN
This version matches a light, lime-green wallet UI: rounded white
cards on an off-white background, a big bold balance number, a
row of circular quick-action buttons (Send / Request / Exchange /
More), a numeric-keypad amount screen with quick amount chips, and
an elevated lime circle for the active bottom-nav tab
(Home / Statistic / Card / Profile).

FEATURES
- Passcode lock screen (default passcode: 1472), also used to
  confirm every send/request/exchange/top-up
- Two accounts - Checking and Savings - switchable from the card
  chip at the top of Home; Exchange moves money between them
- Send money (bank details, or straight to your own savings),
  Request money, and Top up, all sharing one amount-entry screen
  (numeric keypad + quick chips) followed by a details step and a
  passcode-confirm sheet with a pending -> success animation
- Local transaction history with search, filters, and a detail view
  for any transaction, grouped by day
- Statistic tab: received vs. sent for the week/month/all time, a
  category breakdown, and current account balances
- Card tab: a virtual card visual, freeze/unfreeze toggle, and a
  card nickname field
- Profile tab: editable display name/handle, dark/light mode,
  currency symbol (USD/GBP/EUR/NGN - display only, no conversion),
  notifications toggle (native browser Notification API), change
  passcode, clear history, reset app
- Everything persists to LocalStorage

IMPORTANT
This package is a front-end wallet interface only. It stores account
state locally on the device. It is not connected to any real bank,
card network, or payment processor - connecting Send, Request, and
Top Up to real money movement would require a secure backend and
licensed payment/banking infrastructure.

iPhone:
For a quick home-screen experience, open index.html in Safari after
hosting it on a web server, then Share > Add to Home Screen. Local
file previews may not support every PWA feature.

Notifications: uses the browser's built-in Notification API (no
backend needed). Works well in Chrome/Android. iOS Safari does not
support this API even when the site is added to the Home Screen -
Apple requires the separate Web Push + service worker path for that,
which is out of scope for a static local file.
