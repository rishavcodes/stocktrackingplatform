# Tradebox Notifications Inventory

A complete catalogue of every notification the backend (`server/src`) generates. Notifications are grouped by source file. Each entry lists the trigger, channel(s), recipient, content, and the file:line where it originates.

> All file paths are relative to `server/src/`.

---

## 1. Channels & Infrastructure

### 1.1 Channels in use

| Channel | Transport | How dispatched |
|---|---|---|
| In-app | MongoDB `NotificationModel` + Socket.io `/notifications` namespace | `helpers/sendNotification.ts` |
| Email | Nodemailer (Hostinger SMTP) via BullMQ `mail-queue` | [helpers/nodemailer.ts](server/src/helpers/nodemailer.ts), [queues/MailQueues.ts](server/src/queues/MailQueues.ts), [workers/MailWorkers.ts](server/src/workers/MailWorkers.ts) |
| Telegram (DM / channel) | Telegram Bot API via BullMQ `telegram-message-queue` | [config/telegram.ts](server/src/config/telegram.ts), [queues/TelegramMessageQueue.ts](server/src/queues/TelegramMessageQueue.ts), [workers/TelegramMessageWorker.ts](server/src/workers/TelegramMessageWorker.ts) |
| WhatsApp | WhatsApp Business Cloud API via BullMQ `whatsapp-message-queue` | [queues/WhatsappMessageQueue.ts](server/src/queues/WhatsappMessageQueue.ts), [workers/WhatsappMessageWorker.ts](server/src/workers/WhatsappMessageWorker.ts), [controllers/WhatsappController.ts](server/src/controllers/WhatsappController.ts) |
| SMS | ProactiveSMS HTTP API | [controllers/AuthController/OTPController.ts](server/src/controllers/AuthController/OTPController.ts) |
| Internal PubSub | Redis pub/sub (`publishScorecardChange`) | [services/GlobalTradeTracker.ts](server/src/services/GlobalTradeTracker.ts) (not user-facing) |

### 1.2 Core dispatch helpers

| Helper | Purpose |
|---|---|
| [helpers/sendNotification.ts](server/src/helpers/sendNotification.ts) | Universal in-app + socket dispatcher. Creates a `NotificationModel` doc, fans the id into each recipient's `notifications[]` array, then emits `notification:new` on the `/notifications` namespace room. |
| [helpers/Notify.ts](server/src/helpers/Notify.ts) — `notifyWalletChange()` | Persists a wallet-change in-app notification for a single SP. Supports a Mongo `session` for transactional saves. |
| [helpers/Notify.ts](server/src/helpers/Notify.ts) — `adminNotify()` | In-app to every admin + Telegram admin channel via `sendBotAdminMessage()`. |
| [config/telegram.ts](server/src/config/telegram.ts) | `sendTelegramMessage`, `sendBotAdminMessage`, `sendBotPublicMessage`, `removeUserFromChannel`, `isUserInChannel`, `getChannelInviteLink`, `sendBotAdminRequest`, `handleJoinRequest`. |

### 1.3 `NotificationModel` types

From [models/NotificationModel.ts](server/src/models/NotificationModel.ts):

`contact`, `service`, `admin`, `event`, `Post Like`, `TradyCoin Credit`, `membership`, `payment-verification`, `payment-verified`, `payment-rejected`, `wallet`, `birthday`, `broadcast`, `recommendation-new`, `recommendation-closed`, `portfolio-update`, `content-added`, `event-update`, `trade-placed`, `trade-rejected`, `trade-modified`, `trade-cancelled`, `broker-disconnected`, `renewal-success`, `renewal-failed`, `kyc-approved`, `kyc-rejected`, `profile-incomplete`, `bank-missing`, `announcement`, `plan-expiring`, `plan-expired`, `system`.

Categories: `admin`, `sp`, `broker`.

---

## 2. Scheduled Jobs (`scheduled-jobs/`)

### 2.1 User birthday wish — [scheduled-jobs/userBirthdayReminder.ts:16-94](server/src/scheduled-jobs/userBirthdayReminder.ts#L16-L94)
- **Trigger:** Daily 09:00 IST. User's DOB matches today.
- **Channel:** In-app
- **Recipient:** The user, on behalf of each SP they subscribe to
- **Type:** `birthday`
- **Content:** Birthday wish from each subscribed SP.

### 2.2 Service-provider birthday wish — [scheduled-jobs/serviceProviderBirthdayReminder.ts:12-69](server/src/scheduled-jobs/serviceProviderBirthdayReminder.ts#L12-L69)
- **Trigger:** Daily 09:00 IST. SP's DOB matches today.
- **Channel:** In-app
- **Recipient:** Service Provider
- **Type:** `birthday`
- **Content:** System birthday wish.

### 2.3 Event reminders — [scheduled-jobs/eventReminder.ts:19-114](server/src/scheduled-jobs/eventReminder.ts#L19-L114)
- **Trigger:** Daily 10:00 IST. Sent at 7 / 3 / 1 / 0 days before event.
- **Channels:** Email + In-app
- **Recipient:** Event registrants
- **Type:** `event`
- **Content:** Event title, date, mode (online/offline), location/link.

### 2.4 Wallet low-balance reminder — [scheduled-jobs/walletLowBalanceReminder.ts:9-107](server/src/scheduled-jobs/walletLowBalanceReminder.ts#L9-L107)
- **Trigger:** Daily 09:00 IST. SP wallet < ₹500. **Currently paused** (see commit `28bac8df`).
- **Channels:** Email + In-app
- **Recipient:** Service Provider
- **Type:** `wallet`
- **Content:** Low-balance warning + recharge CTA.

### 2.5 Profile completeness check — [scheduled-jobs/profileCompletenessCheck.ts:16-74](server/src/scheduled-jobs/profileCompletenessCheck.ts#L16-L74)
- **Trigger:** Mondays 04:30 UTC (10:00 IST). User missing PAN or Aadhaar. Throttled to once per 7 days.
- **Channel:** In-app
- **Recipient:** User
- **Type:** `profile-incomplete`
- **Content:** "Complete your profile (PAN/Aadhaar)".

### 2.6 Plan expiry & renewal — [scheduled-jobs/PlanExpiryStatusCheck.ts:616-627](server/src/scheduled-jobs/PlanExpiryStatusCheck.ts#L616-L627)
- **Trigger:** Reminders daily 09:00 IST; expiry/removal daily 23:00 IST. Orders expiring in 5 / 3 / 1 / 0 days.
- **Channels:** Email + Telegram DM + In-app
- **Recipient:** Customer
- **Types:** `plan-expiring`, `plan-expired`
- **Content:** "Renew Now" CTA. On expiry, also removes user from Telegram channel (`removeUserFromChannel`) with retry.

### 2.7 Free-trial expiry — [scheduled-jobs/FreeTrailExpiryStatusCheck.ts:10-81](server/src/scheduled-jobs/FreeTrailExpiryStatusCheck.ts#L10-L81)
- **Trigger:** Every 4 hours. Free trial expiring within 1 day, or already expired.
- **Channels:** Email + In-app
- **Recipient:** Customer
- **Type:** `plan-expiring`
- **Content:** Free-trial expiry warning.

### 2.8 Portfolio daily PDF report — [scheduled-jobs/portfolioReportCron.ts:56-165](server/src/scheduled-jobs/portfolioReportCron.ts#L56-L165)
- **Trigger:** Daily 17:33 IST (post-market). For every portfolio with subscribers.
- **Channel:** Email (via `mailQueue`)
- **Recipient:** Each portfolio subscriber
- **From / Subject:** `info@tradeboxlive.com` / "Your Portfolio Report: {name} Date: {iso}"
- **Content:** Branded HTML email with S3-hosted PDF link ("Open Report" button).

### 2.9 Telegram join check — [scheduled-jobs/TelegramJoinCheck.ts:1-16](server/src/scheduled-jobs/TelegramJoinCheck.ts#L1-L16)
- **Currently disabled** (file body commented out).

---

## 3. Payment Controller — [controllers/PaymentController.ts](server/src/controllers/PaymentController.ts)

### 3.1 Wallet debit — commission/onboarding charge — [PaymentController.ts:691-701](server/src/controllers/PaymentController.ts#L691-L701)
- In-app, type `wallet`, to SP. "₹{amount} debited from wallet — {reason}".

### 3.2 Admin Telegram — promo code claimed — [PaymentController.ts:1690-1696](server/src/controllers/PaymentController.ts#L1690-L1696)
- Telegram admin channel. "{Customer} has claimed {CouponCode} for {Service}".

### 3.3 Order purchase / renewal (gateway flow) — [PaymentController.ts:1916-1921](server/src/controllers/PaymentController.ts#L1916-L1921)
- In-app, type `service`, to SP. "{Customer} has purchased/renewed your plan {ServiceName}".

### 3.4 Wallet debit — marketplace commission — [PaymentController.ts:2249-2259](server/src/controllers/PaymentController.ts#L2249-L2259)
- In-app, type `wallet`, to SP.

### 3.5 Manual payment uploaded (service order) — [PaymentController.ts:2481-2486](server/src/controllers/PaymentController.ts#L2481-L2486)
- In-app, type `payment-verification`, to SP. "New order from {Customer} for {Service} - Payment proof uploaded, pending verification".

### 3.6 Order confirmation email (gateway) — [PaymentController.ts:2605-2617](server/src/controllers/PaymentController.ts#L2605-L2617)
- Email to customer. Invoice + Telegram channel join link.

### 3.7 Wallet credit — broker commission to SP — [PaymentController.ts:3027-3037](server/src/controllers/PaymentController.ts#L3027-L3037)
- In-app, type `wallet`, to SP.

### 3.8 Wallet debit — RA wallet reduction — [PaymentController.ts:3042-3052](server/src/controllers/PaymentController.ts#L3042-L3052)
- In-app, type `wallet`.

### 3.9 Marketplace manual payment — [PaymentController.ts:3255-3260](server/src/controllers/PaymentController.ts#L3255-L3260)
- In-app, type `payment-verification`, to SP.

### 3.10 Marketplace order email — [PaymentController.ts:3421-3428](server/src/controllers/PaymentController.ts#L3421-L3428)
- Email to customer.

### 3.11 Wallet credit — Tradebox plan payment — [PaymentController.ts:3650-3660](server/src/controllers/PaymentController.ts#L3650-L3660)
- In-app, type `wallet`.

### 3.12 Payment verified — user — [PaymentController.ts:3886-3895](server/src/controllers/PaymentController.ts#L3886-L3895)
- In-app, type `payment-verified`, to customer. "Your payment for {ServiceName} has been verified. Your subscription is now active!" — CTA "View Receipt".

### 3.13 Payment verified — SP — [PaymentController.ts:3898-3909](server/src/controllers/PaymentController.ts#L3898-L3909)
- In-app, type `service`, to SP. "{Customer} has purchased/renewed your plan {ServiceName}" — CTA "View Lead".

### 3.14 Payment confirmation email + Telegram invite — [PaymentController.ts:3940-3970](server/src/controllers/PaymentController.ts#L3940-L3970)
- Email to customer. Subscription details + Telegram join link.

### 3.15 Payment rejected (in-app) — [PaymentController.ts:4133-4142](server/src/controllers/PaymentController.ts#L4133-L4142)
- In-app, type `payment-rejected`, to customer. CTA "View Details".

### 3.16 Payment rejected (email) — [PaymentController.ts:4148-4183](server/src/controllers/PaymentController.ts#L4148-L4183)
- Email to customer. Subject "Payment Rejected - {ServiceName}".

### 3.17 Wallet debit — broker order — [PaymentController.ts:4474-4484](server/src/controllers/PaymentController.ts#L4474-L4484)
- In-app, type `wallet`.

### 3.18 Wallet split (SP/broker) — [PaymentController.ts:5056-5066](server/src/controllers/PaymentController.ts#L5056-L5066)
- In-app, type `wallet`.

### 3.19 Verified order email (service/portfolio/package) — [PaymentController.ts:5376-5410](server/src/controllers/PaymentController.ts#L5376-L5410)
- Email to customer.

### 3.20 Verified marketplace order email — [PaymentController.ts:5748-5780](server/src/controllers/PaymentController.ts#L5748-L5780)
- Email to customer.

### 3.21 Wallet debit — auto-renewal charge — [PaymentController.ts:6125-6135](server/src/controllers/PaymentController.ts#L6125-L6135)
- In-app, type `wallet`.

### 3.22 First-purchase notify-SP (legacy site) — [PaymentController.ts:554-561](server/src/controllers/PaymentController.ts#L554-L561)
- In-app, type `service`, to SP.

---

## 4. Post Content Controller — [controllers/PostContentController.ts](server/src/controllers/PostContentController.ts)

### 4.1 Article published — followers in-app — [PostContentController.ts:145-155](server/src/controllers/PostContentController.ts#L145-L155)
- In-app, type `content-added`, category `sp`, to SP followers. "{SPName} posted a new article" — CTA "View Article".

### 4.2 Article — admin Telegram — [PostContentController.ts:157-159](server/src/controllers/PostContentController.ts#L157-L159)
- Telegram admin channel.

### 4.3 Article — public Telegram (share=all) — [PostContentController.ts:190-192](server/src/controllers/PostContentController.ts#L190-L192)
- Telegram public channel with thumbnail.

### 4.4 Article — subscriber in-app (share=plan) — [PostContentController.ts:197-207](server/src/controllers/PostContentController.ts#L197-L207)
- In-app, type `content-added`, to plan subscribers.

### 4.5 Article — Telegram service channel — [PostContentController.ts:210](server/src/controllers/PostContentController.ts#L210)
- Telegram service-plan channel.

### 4.6 Video — followers in-app — [PostContentController.ts:424-434](server/src/controllers/PostContentController.ts#L424-L434)
- In-app, type `content-added`. "{SPName} posted a new video" — CTA "Watch Video".

### 4.7 Video — admin Telegram — [PostContentController.ts:436-438](server/src/controllers/PostContentController.ts#L436-L438)
- Telegram admin channel.

### 4.8 Video — public Telegram — [PostContentController.ts:452](server/src/controllers/PostContentController.ts#L452)
- Telegram public channel with thumbnail.

### 4.9 Podcast — followers in-app — [PostContentController.ts:652-662](server/src/controllers/PostContentController.ts#L652-L662)
- In-app, type `content-added`. "{SPName} posted a new podcast" — CTA "Listen Now".

### 4.10 Podcast — admin Telegram — [PostContentController.ts:664-666](server/src/controllers/PostContentController.ts#L664-L666)
- Telegram admin channel.

### 4.11 Podcast — public Telegram — [PostContentController.ts:681](server/src/controllers/PostContentController.ts#L681)
- Telegram public channel with thumbnail.

### 4.12 Event created — admin Telegram — [PostContentController.ts:886-888](server/src/controllers/PostContentController.ts#L886-L888)
- Telegram admin channel. "{SPName} has uploaded a new event under category {category}, please approve!".

### 4.13 Event created — followers in-app — [PostContentController.ts:892-902](server/src/controllers/PostContentController.ts#L892-L902)
- In-app, type `event`. "{SPName} scheduled a new event: {EventTitle}" — CTA "View Event".

---

## 5. ScoreCard Controller — [controllers/ScoreCardController.ts](server/src/controllers/ScoreCardController.ts)

### 5.1 New recommendation — admin Telegram — [ScoreCardController.ts:399-401](server/src/controllers/ScoreCardController.ts#L399-L401)
- Telegram admin channel.

### 5.2 New recommendation — Telegram service channel — [ScoreCardController.ts:367](server/src/controllers/ScoreCardController.ts#L367)
- Telegram service-plan channel.

### 5.3 Scorecard update — Telegram service channel — [ScoreCardController.ts:489](server/src/controllers/ScoreCardController.ts#L489)
- Telegram service-plan channel.

### 5.4 Trade exit — Telegram service channel — [ScoreCardController.ts:893](server/src/controllers/ScoreCardController.ts#L893)
- Telegram service-plan channel.

### 5.5 Scorecard modification — Telegram service channel — [ScoreCardController.ts:1235](server/src/controllers/ScoreCardController.ts#L1235)
- Telegram service-plan channel.

### 5.6 Scorecard PDF email — [ScoreCardController.ts:2605-2617](server/src/controllers/ScoreCardController.ts#L2605-L2617)
- Email to service-plan subscribers. PDF report attached.

---

## 6. ScoreCard helper — [helpers/updateScoreCard.ts](server/src/helpers/updateScoreCard.ts)

### 6.1 Trade close — Telegram exit messages — [helpers/updateScoreCard.ts:171-181](server/src/helpers/updateScoreCard.ts#L171-L181), [:234-243](server/src/helpers/updateScoreCard.ts#L234-L243), [:274-283](server/src/helpers/updateScoreCard.ts#L274-L283)
- Telegram, to all channels linked to the trade's `shareWithPlans`. Symbol + exit price + P/L + reason (SL/TP/timeout).

### 6.2 Trade close — subscribers in-app — [helpers/updateScoreCard.ts:354-366](server/src/helpers/updateScoreCard.ts#L354-L366)
- In-app, type `recommendation-closed`, category `sp`, to all subscribers of the trade's shared plans. CTA "View Outcome".

---

## 7. Global Trade Tracker — [services/GlobalTradeTracker.ts](server/src/services/GlobalTradeTracker.ts)

### 7.1 Trade exit (SL/TP/target/timeout) — Telegram — [GlobalTradeTracker.ts:219-228](server/src/services/GlobalTradeTracker.ts#L219-L228), [:289-300](server/src/services/GlobalTradeTracker.ts#L289-L300), [:333-342](server/src/services/GlobalTradeTracker.ts#L333-L342)
- Telegram service-plan channels. Built with `buildExitTelegramMessage()`. Includes symbol, exit price, P/L (abs+%), target index when applicable.

### 7.2 Internal scorecard pubsub — [GlobalTradeTracker.ts:95-101](server/src/services/GlobalTradeTracker.ts#L95-L101), [:145-151](server/src/services/GlobalTradeTracker.ts#L145-L151), [:420-426](server/src/services/GlobalTradeTracker.ts#L420-L426)
- Redis PubSub via `publishScorecardChange()`. Not user-facing — used by other services/dashboards. Payload: `{ type, tradeId, authorId, planIds, marketplaceIds }`.

---

## 8. User Controller — [controllers/UserController.ts](server/src/controllers/UserController.ts)

### 8.1 Follow SP — admin Telegram — [UserController.ts:105](server/src/controllers/UserController.ts#L105)
- Telegram admin channel. "{UserName} started following {SPName}".

### 8.2 Event registration — email to attendee — [UserController.ts:843-847](server/src/controllers/UserController.ts#L843-L847)
- Email. Subject "Event Registration Confirmation". Event details + mode.

### 8.3 Event registration — in-app to SP — [UserController.ts:852-857](server/src/controllers/UserController.ts#L852-L857)
- In-app to event author. "{UserName} subscribed to your {EventTitle} event ({Mode} mode)".

### 8.4 Event registration — admin Telegram — [UserController.ts:864-866](server/src/controllers/UserController.ts#L864-L866)
- Telegram admin channel.

### 8.5 Email OTP — [UserController.ts:1517](server/src/controllers/UserController.ts#L1517)
- Email. Subject "TradeBox - Verify Your Email". 4-digit OTP, 10-min validity.

---

## 9. Auth Controllers

### 9.1 Provider sign-up — admin Telegram — [controllers/AuthController/ProviderAuthController.ts:143-147](server/src/controllers/AuthController/ProviderAuthController.ts#L143-L147)
- Telegram admin channel. "{SPName} registered as {type}".

### 9.2 Provider sign-up — welcome email — [controllers/AuthController/ProviderAuthController.ts:149-154](server/src/controllers/AuthController/ProviderAuthController.ts#L149-L154)
- Email to SP. Subject "Welcome to TradeBox".

### 9.3 Registration OTP — email — [controllers/AuthController/OTPController.ts:50-67](server/src/controllers/AuthController/OTPController.ts#L50-L67)
- Email. Subject "TradeBox OTP". 4-digit OTP, 10-min validity.

### 9.4 Registration OTP — SMS (mobile) — [controllers/AuthController/OTPController.ts:135-167](server/src/controllers/AuthController/OTPController.ts#L135-L167)
- SMS via ProactiveSMS. "Your Mobile no verification code is [OTP]. This is valid for 10 minutes. - Tradebox RA".

### 9.5 Password-reset OTP — email — [controllers/AuthController/OTPController.ts:209-225](server/src/controllers/AuthController/OTPController.ts#L209-L225)
- Email. Subject "TradeBox Password Reset OTP".

---

## 10. Broker — Bigul — [controllers/Bigul/orderController.ts](server/src/controllers/Bigul/orderController.ts)

### 10.1 Trade placed — [Bigul/orderController.ts:76-86](server/src/controllers/Bigul/orderController.ts#L76-L86)
- In-app, type `trade-placed`, category `broker`, broker `bigul`. "Your order for {OrderDesc} has been placed."

### 10.2 Trade rejected — [Bigul/orderController.ts:96-106](server/src/controllers/Bigul/orderController.ts#L96-L106)
- In-app, type `trade-rejected`.

### 10.3 Trade error (transport/API) — [Bigul/orderController.ts:122-132](server/src/controllers/Bigul/orderController.ts#L122-L132)
- In-app, type `trade-rejected`.

### 10.4 Trade modified — [Bigul/orderController.ts:513-523](server/src/controllers/Bigul/orderController.ts#L513-L523)
- In-app, type `trade-modified`.

---

## 11. Broker — AliceBlue — [controllers/AliceBlue/orderController.ts](server/src/controllers/AliceBlue/orderController.ts)

### 11.1 Trade placed — [AliceBlue/orderController.ts:146-155](server/src/controllers/AliceBlue/orderController.ts#L146-L155)
- In-app, type `trade-placed`, broker `aliceblue`.

### 11.2 Trade rejected — [AliceBlue/orderController.ts:165-175](server/src/controllers/AliceBlue/orderController.ts#L165-L175)
- In-app, type `trade-rejected`.

### 11.3 Trade error — [AliceBlue/orderController.ts:191-201](server/src/controllers/AliceBlue/orderController.ts#L191-L201)
- In-app, type `trade-rejected`.

### 11.4 Trade modified — [AliceBlue/orderController.ts:362-372](server/src/controllers/AliceBlue/orderController.ts#L362-L372)
- In-app, type `trade-modified`.

### 11.5 Trade cancelled — [AliceBlue/orderController.ts:400-410](server/src/controllers/AliceBlue/orderController.ts#L400-L410)
- In-app, type `trade-cancelled`.

---

## 12. Support Ticket — [controllers/SupportTicketController.ts](server/src/controllers/SupportTicketController.ts)

### 12.1 Notify all admins — [SupportTicketController.ts:43-54](server/src/controllers/SupportTicketController.ts#L43-L54)
- In-app, type `admin`. Pushed into `AdminModel.notifications[]`.

### 12.2 Notify SP — [SupportTicketController.ts:56-74](server/src/controllers/SupportTicketController.ts#L56-L74)
- In-app, type `admin`. Pushed into SP/UserModel `notifications[]`.

---

## 13. Admin / SuperUser actions — [controllers/SuperUserActions.ts](server/src/controllers/SuperUserActions.ts)

### 13.1 SP registration email — [SuperUserActions.ts:1407-1441](server/src/controllers/SuperUserActions.ts#L1407-L1441)
- Email "Welcome to TradeBox!".

### 13.2 SP profile-update email — [SuperUserActions.ts:1523-1557](server/src/controllers/SuperUserActions.ts#L1523-L1557)
- Email to SP.

### 13.3 SP verification email — [SuperUserActions.ts:1645-1679](server/src/controllers/SuperUserActions.ts#L1645-L1679)
- Email. Verification confirmation + SLA.

### 13.4 SP verification — in-app — [SuperUserActions.ts:1260-1277](server/src/controllers/SuperUserActions.ts#L1260-L1277)
- In-app, type `admin`. "Congratulations on successfully registering with us…".

### 13.5 Broadcast notification — [SuperUserActions.ts:2151-2207](server/src/controllers/SuperUserActions.ts#L2151-L2207)
- In-app, type `announcement`, category `admin`. To Users or Providers. Optional CTA label / post link.

### 13.6 Tradebox plan purchase email — [SuperUserActions.ts:2582-2616](server/src/controllers/SuperUserActions.ts#L2582-L2616)
- Email to SP. Invoice + plan details.

### 13.7 Tradebox plan upgrade email — [SuperUserActions.ts:2632-2666](server/src/controllers/SuperUserActions.ts#L2632-L2666)
- Email to SP.

### 13.8 Membership activation — admin in-app — [SuperUserActions.ts:2936-2941](server/src/controllers/SuperUserActions.ts#L2936-L2941)
- In-app, type `membership`. "{Plan} has been added to Research Analyst {SPName}".

### 13.9 Membership activation — SP in-app — [SuperUserActions.ts:2943-2948](server/src/controllers/SuperUserActions.ts#L2943-L2948)
- In-app, type `membership`. "Your {Plan} membership is now active!".

### 13.10 Wallet debit by admin — [SuperUserActions.ts:3343-3353](server/src/controllers/SuperUserActions.ts#L3343-L3353)
- In-app, type `wallet`.

### 13.11 Wallet credit by admin — [SuperUserActions.ts:3414-3424](server/src/controllers/SuperUserActions.ts#L3414-L3424)
- In-app, type `wallet`.

---

## 14. E-Sign — [controllers/esignController.ts:132-136](server/src/controllers/esignController.ts#L132-L136)
- Email to SP on e-sign session completion.

---

## 15. Auto-renewal — [services/autoRenewalService.ts:414-470](server/src/services/autoRenewalService.ts#L414-L470)
- Email. Subject "Auto-Renewal Confirmation for {PlanName}". To customer (optionally SP). Confirmation + plan details + Telegram link.

---

## 16. WhatsApp Controller — [controllers/WhatsappController.ts](server/src/controllers/WhatsappController.ts)
- Sends WhatsApp Business API messages (templates `trade_change`, `new_recommendation`) to subscribers with WhatsApp linked. See [WhatsappController.ts:23-200](server/src/controllers/WhatsappController.ts#L23-L200).

WhatsApp queue helpers in [queues/WhatsappMessageQueue.ts](server/src/queues/WhatsappMessageQueue.ts):
- `addWhatsappMessageToQueue` — [queues/WhatsappMessageQueue.ts:43-60](server/src/queues/WhatsappMessageQueue.ts#L43-L60)
- `addBulkWhatsappMessagesToQueue` — [queues/WhatsappMessageQueue.ts:66-85](server/src/queues/WhatsappMessageQueue.ts#L66-L85)

---

## 17. Invoice Workers — [workers/InvoiceWorkers.ts](server/src/workers/InvoiceWorkers.ts)

### 17.1 Tradebox plan invoice email — [InvoiceWorkers.ts:47-103](server/src/workers/InvoiceWorkers.ts#L47-L103)
- Email to SP with attached PDF invoice (base64). Subject "Invoice for {Plan} purchase".

### 17.2 Service-purchase invoice PDF — [InvoiceWorkers.ts:169-210](server/src/workers/InvoiceWorkers.ts#L169-L210)
- Generates invoice PDF to S3 and stores link on Order. (Email dispatch handled in order-creation flow above.)

---

## 18. Pure executors / queues (no triggers)

These files only execute or queue notifications, not trigger them — included for completeness:

| File | Role |
|---|---|
| [workers/MailWorkers.ts](server/src/workers/MailWorkers.ts) | Dequeues `mail-queue` and calls `transporter.sendMail`. 3 retries, logs only on error. |
| [workers/TelegramMessageWorker.ts](server/src/workers/TelegramMessageWorker.ts) | Dequeues `telegram-message-queue`. 200ms throttle between sends. |
| [workers/WhatsappMessageWorker.ts](server/src/workers/WhatsappMessageWorker.ts) | Dequeues `whatsapp-message-queue`. Validates SP WA setup + subscriber + phone. 3 retries with backoff, max 100 jobs/min, 5 concurrency. |
| [queues/MailQueues.ts](server/src/queues/MailQueues.ts) | BullMQ queue instance. |
| [queues/TelegramMessageQueue.ts](server/src/queues/TelegramMessageQueue.ts) | BullMQ queue instance. |
| [queues/WhatsappMessageQueue.ts](server/src/queues/WhatsappMessageQueue.ts) | BullMQ queue + helpers. |
| [controllers/HomeDataController.ts](server/src/controllers/HomeDataController.ts) | Reads / clears / deletes notifications only — does not generate any. |
| [helpers/razorpaySubscription.ts](server/src/helpers/razorpaySubscription.ts) | Razorpay plan/sub helpers only — no notifications. |

---

## 19. Summary by channel

| Channel | Sites | Highlights |
|---|---|---|
| **In-app** | ~45 | All wallet changes, payment verification/rejection, trade lifecycle (place/reject/modify/cancel/close), content publishing, events, birthdays, membership, admin broadcasts, profile-incomplete, plan-expiring/expired. |
| **Email** | ~20 | OTPs, order confirmations, payment rejection, scorecard PDF, portfolio PDF, event registration, event reminders, SP welcome/verification/update, Tradebox plan invoice, auto-renewal confirmation, e-sign completion, plan expiry reminders, low-balance reminders. |
| **Telegram (admin channel)** | ~10 | SP signup, promo claim, follow events, new article/video/podcast/event, new recommendation, event registration. |
| **Telegram (public channel)** | 3 | Public-share article / video / podcast announcements with thumbnails. |
| **Telegram (service plan channel)** | ~6 | Scorecard create / update / exit / modification messages; trade-exit messages from `GlobalTradeTracker` and `updateScoreCard`. |
| **Telegram (user DM)** | 1 | Plan expiry / renewal reminders (`PlanExpiryStatusCheck`). |
| **WhatsApp** | dynamic | Templates `trade_change`, `new_recommendation` to subscribers with WhatsApp linked (queued from scorecard flow). |
| **SMS** | 1 | Mobile-OTP only (ProactiveSMS). |
| **Internal PubSub** | 3 | Redis `publishScorecardChange` — non-user-facing dashboard updates. |

---

## 20. Quick-find index by event

- **Birthday** → [2.1](#21-user-birthday-wish--scheduled-jobsuserbirthdayreminderts16-94), [2.2](#22-service-provider-birthday-wish--scheduled-jobsserviceproviderbirthdayreminderts12-69)
- **Event** → [2.3](#23-event-reminders--scheduled-jobseventreminderts19-114), [8.2](#82-event-registration--email-to-attendee--usercontrollerts843-847), [8.3](#83-event-registration--in-app-to-sp--usercontrollerts852-857), [8.4](#84-event-registration--admin-telegram--usercontrollerts864-866), [4.12](#412-event-created--admin-telegram--postcontentcontrollerts886-888), [4.13](#413-event-created--followers-in-app--postcontentcontrollerts892-902)
- **Wallet** → [2.4](#24-wallet-low-balance-reminder--scheduled-jobswalletlowbalancereminderts9-107), [3.1](#31-wallet-debit--commissiononboarding-charge--paymentcontrollerts691-701), [3.4](#34-wallet-debit--marketplace-commission--paymentcontrollerts2249-2259), [3.7](#37-wallet-credit--broker-commission-to-sp--paymentcontrollerts3027-3037), [3.8](#38-wallet-debit--ra-wallet-reduction--paymentcontrollerts3042-3052), [3.11](#311-wallet-credit--tradebox-plan-payment--paymentcontrollerts3650-3660), [3.17](#317-wallet-debit--broker-order--paymentcontrollerts4474-4484), [3.18](#318-wallet-split-spbroker--paymentcontrollerts5056-5066), [3.21](#321-wallet-debit--auto-renewal-charge--paymentcontrollerts6125-6135), [13.10](#1310-wallet-debit-by-admin--superuseractionsts3343-3353), [13.11](#1311-wallet-credit-by-admin--superuseractionsts3414-3424)
- **Payment** → [3.5](#35-manual-payment-uploaded-service-order--paymentcontrollerts2481-2486), [3.6](#36-order-confirmation-email-gateway--paymentcontrollerts2605-2617), [3.9](#39-marketplace-manual-payment--paymentcontrollerts3255-3260), [3.10](#310-marketplace-order-email--paymentcontrollerts3421-3428), [3.12](#312-payment-verified--user--paymentcontrollerts3886-3895), [3.13](#313-payment-verified--sp--paymentcontrollerts3898-3909), [3.14](#314-payment-confirmation-email--telegram-invite--paymentcontrollerts3940-3970), [3.15](#315-payment-rejected-in-app--paymentcontrollerts4133-4142), [3.16](#316-payment-rejected-email--paymentcontrollerts4148-4183), [3.19](#319-verified-order-email-serviceportfoliopackage--paymentcontrollerts5376-5410), [3.20](#320-verified-marketplace-order-email--paymentcontrollerts5748-5780)
- **Plan expiry / renewal** → [2.6](#26-plan-expiry--renewal--scheduled-jobsplanexpirystatuscheckts616-627), [2.7](#27-free-trial-expiry--scheduled-jobsfreetrailexpirystatuscheckts10-81), [15](#15-auto-renewal--servicesautorenewalservicets414-470)
- **Content (article/video/podcast)** → [4.1–4.11](#4-post-content-controller--controllerspostcontentcontrollerts)
- **Recommendation / scorecard / trade exit** → [5](#5-scorecard-controller--controllersscorecardcontrollerts), [6](#6-scorecard-helper--helpersupdatescorecardts), [7](#7-global-trade-tracker--servicesglobaltradetrackerts)
- **Broker trade lifecycle** → [10](#10-broker--bigul--controllersbigulordercontrollerts), [11](#11-broker--aliceblue--controllersalicebluordercontrollerts)
- **OTP** → [8.5](#85-email-otp--usercontrollerts1517), [9.3](#93-registration-otp--email--controllersauthcontrollerotpcontrollerts50-67), [9.4](#94-registration-otp--sms-mobile--controllersauthcontrollerotpcontrollerts135-167), [9.5](#95-password-reset-otp--email--controllersauthcontrollerotpcontrollerts209-225)
- **Profile completeness** → [2.5](#25-profile-completeness-check--scheduled-jobsprofilecompletenesscheckts16-74)
- **Portfolio report** → [2.8](#28-portfolio-daily-pdf-report--scheduled-jobsportfolioreportcronts56-165)
- **Support ticket** → [12](#12-support-ticket--controllerssupportticketcontrollerts)
- **Admin broadcast / membership / verification** → [13](#13-admin--superuser-actions--controllerssuperuseractionsts)
- **WhatsApp templates** → [16](#16-whatsapp-controller--controllerswhatsappcontrollerts)
- **E-sign** → [14](#14-e-sign--controllersesigncontrollerts132-136)
- **Invoices** → [17](#17-invoice-workers--workersinvoiceworkersts)
