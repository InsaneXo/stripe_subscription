require("dotenv").config();
const express = require("express");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();

app.set("view engine", "ejs");

app.get("/", async (req, res) => {
  res.render("index.ejs");
});

app.get("/subscribe", async (req, res) => {
  const plan = req.query.plan;

  if (!plan) {
    return res.send("Subscription plan not found");
  }

  let priceId;

  switch (plan.toLowerCase()) {
    case "starter":
      priceId = "price_1QwpVuIGpMHDMf2vs5J6NgKh";
      break;

    case "pro":
      priceId = "price_1QwpWSIGpMHDMf2v46fGxN7X";
      break;

    default:
      return res.send("Subscription plan not found");
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    metadata:{
      userId : "1234567890"
    },
    success_url: `${process.env.BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.BASE_URL}/cancel`,
  });
  console.log(session);
  res.redirect(session.url);
});

app.get("/success", async (req, res) => {
  const session = await stripe.checkout.sessions.retrieve(req.query.session_id, { expand: ['subscription', 'subscription.plan.product']})
  //const session = await stripe.checkout.sessions.retrieve(req.query.session_id, { expand: ['subscription', 'subscription.plan.product'] })

  // console.log("Success Route", session)

  res.send("Subscribed successfully");
});

app.get("/cancel", (req, res) => {
  res.redirect("/");
});

app.get("/customers/:customerId", async (req, res) => {
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: req.params.customerId,
    return_url: `${process.env.BASE_URL}/`,
  });

  res.redirect(portalSession.url);
});

app.post("/webhook", express.raw({ type: "application/json" }), (req, res) => {
  const sig = req.headers["stripe-signature"];

    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error("Webhook signature verification failed:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle different Stripe events
    switch (event.type) {
        // Payment Events
        case "payment_intent.succeeded":
            console.log("✅ Payment successful:", event.data);
            break;
        case "payment_intent.payment_failed":
            console.log("❌ Payment failed:", event.data);
            break;
        case "payment_intent.requires_action":
            console.log("⚠️ Payment requires action:", event.data);
            break;
        case "charge.succeeded":
            console.log("✅ Charge succeeded:", event.data);
            break;
        case "charge.failed":
            console.log("❌ Charge failed:", event.data);
            break;
        case "charge.refunded":
            console.log("↩️ Charge refunded:", event.data);
            break;

        // Subscription & Billing Events
        case "customer.subscription.created":
            console.log("📅 New subscription created:", event.data);
            break;
        case "customer.subscription.updated":
          const subMetadata = event.data.object.metadata;
            console.log("🔄 Subscription updated:", event.data);
            console.log("📝 Subscription Details:", subMetadata);
            break;
        case "customer.subscription.deleted":
            console.log("❌ Subscription canceled:", event.data);
            break;
        case "invoice.paid":
            console.log("✅ Invoice paid:", event.data);
            break;
        case "invoice.payment_failed":
            console.log("❌ Invoice payment failed:", event.data);
            break;
        case "invoice.upcoming":
            console.log("📆 Upcoming invoice:", event.data);
            break;

        // Customer & Payment Method Events
        case "customer.created":
            console.log("👤 Customer created:", event.data);
            break;
        case "customer.deleted":
            console.log("🗑️ Customer deleted:", event.data);
            break;
        case "payment_method.attached":
            console.log("💳 Payment method attached:", event.data);
            break;

        // Dispute & Fraud Events
        case "charge.dispute.created":
            console.log("⚠️ Dispute created:", event.data);
            break;
        case "charge.dispute.closed":
            console.log("✅ Dispute closed:", event.data);
            break;
        case "review.opened":
            console.log("🔍 Payment under review:", event.data);
            break;

        // Payout & Transfer Events
        case "payout.created":
            console.log("💰 Payout created:", event.data);
            break;
        case "payout.paid":
            console.log("✅ Payout successful:", event.data);
            break;
        case "payout.failed":
            console.log("❌ Payout failed:", event.data);
            break;

        default:
            console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
});

app.listen(3000, () => console.log("Server started on port 3000"));
