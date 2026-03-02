# YallaStarter Pro

Crowdfunding platform for the Saudi market (Vision 2030).

## Stripe Webhook Setup
Set your Stripe webhook URL to:
`https://<your-domain>/api/coins/webhook`

Events to listen for:
- `checkout.session.completed`

## Verification Endpoints
- `GET /__deployed` - Check deployment status
- `GET /api/ping` - API health check
- `GET /api/coins/webhook` - Webhook info
