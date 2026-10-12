# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Sellers (primary).** Online shops in Uzbekistan that sell through Telegram, Instagram and their own website — both small shops run by the owner from a phone and larger shops with operators and big catalogs. Their job: answer every customer message fast, turn chats into orders, and get paid, without hiring more people.
- **Shoppers.** The shop's customers. They never log in; they talk to the AI seller inside Telegram, Instagram Direct or the web widget, in Uzbek or Russian.
- **Platform owner.** Runs oMarketing itself through the owner-only `/admin` panel: users, shops, subscriptions and trials, invoices, orders, conversations, AI spend, channels.

## Product Purpose

oMarketing is an AI seller for online shops. It replies to shoppers within seconds around the clock, finds the right product in the shop's own catalog, takes the order (name, phone, address) inside the chat, and sends a Payme or Click payment link. The seller sees every conversation and order in one dashboard and gets Telegram notifications.

Success for a seller: no message goes unanswered, chats become paid orders, and setup takes minutes with no programming.

## Positioning

What a generic chatbot cannot truthfully claim:

1. **Answers only from the shop's catalog.** Price, size, color, stock and photos come from what the seller entered; the AI does not invent products or prices.
2. **Takes the order inside the chat.** It collects the customer's details and creates the order itself, handing it to the seller ready to fulfil.
3. **Payment link in the chat.** Payme / Click links are sent in the conversation and the money goes straight to the shop's own account.

## Operating Context

- Channels: Telegram bot, Telegram Business, Instagram Direct, embeddable web widget, plus a test chat (playground) for sellers.
- Seller onboarding: register (email or Telegram), add products (by hand or Excel / CSV import), connect a channel, test in the playground, switch the AI on.
- Seller dashboard: inbox, orders, products, AI settings (tone, greeting, working hours, delivery zones, pickup address, return policy, FAQ, extra instructions), channels, payments config, billing, referral, settings, AI assistant.
- Notifications: a platform notifier bot sends new-order and payment alerts to the seller's Telegram.
- Billing: subscription plans paid by invoice — via a Telegram chat with the owner (confirmed manually in `/admin`), or Payme / Click when configured.

## Capabilities and Constraints

- Languages: Uzbek (default) and Russian across the product; the AI replies in the language the shopper writes in.
- Plans: Start (99 000 so'm / month, 1 000 AI replies), Biznes (199 000 so'm, 5 000 replies), Pro (299 000 so'm, 20 000 replies, Instagram and web widget). Prices are editable data, not fixed copy.
- Free trial: 7 days by default (admin setting), with its own reply limit. Referral program adds bonus days to both shops after the first payment.
- Optional per-order commission percentage (admin setting, default 0).
- Currency is UZS (so'm); time zone Asia/Tashkent.
- AI runs on the Claude API; usage and cost are tracked per shop.
- Stack: Next.js 16 (App Router), React 19, Prisma + PostgreSQL, Tailwind CSS. Deployed as one web app.
- The admin panel is owner-only: separate login from env credentials, not tied to user accounts, never linked from the seller UI.

## Brand Commitments

- Name: **oMarketing**. (Internal package and cookie names still use the earlier working name "sotuvai"; that is not a public name.)
- Voice: plain, friendly, practical; talks to shop owners in their own terms (orders, customers, so'm), not tech jargon.

## Evidence on Hand

- No customers yet (pre-launch). There are **no** real testimonials, customer logos, case studies, usage numbers or revenue figures. Future work must not fabricate any of these.
- Demo content exists (sample shop "Nafis Kiyim", sample chats) and must be presented as a demo, not as a customer.
- Factual product claims that are safe to use: 24/7 replies, Uzbek and Russian, unlimited parallel chats, setup in minutes, Payme / Click, Excel / CSV import, 7-day free trial without a card.
- Promo video sources live in `promo/`.

## Product Principles

1. **Never make things up.** The AI and the marketing alike speak only from real data: the shop's catalog for the AI, confirmed facts for the site.
2. **From message to paid order without leaving the chat.** Every feature serves the path reply → order → payment.
3. **Minutes, not projects.** A shop owner with a phone and no developer must be able to set it up alone.
4. **The seller stays in control.** Tone, rules and delivery terms come from the seller; they can pause the AI and take over any conversation.
5. **Local by default.** Uzbek first, Russian equal, so'm, Tashkent time, local payment rails.
