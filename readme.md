
# Whatsapp + LLM

## Setup
- Make a new Cloudflare Worker

```bash
npm create cloudflare@latest -- .
```
## Tips

- Save your secrets: `wrangler secret put <secret_name>`
- See logs: `wrangler tail`

## Setup WhatsApp (Worker Side)

1. Check the secret code matches
2. Say "OK" right away to WhatsApp
3. Make sure the message is real

## Setup WhatsApp (Meta Side)

1. Go to https://developers.facebook.com/
2. Click "My Apps"
3. Make a new app and click WhatsApp
4. Click "Configuration" 
5. Turn on ONLY messages
6. Add your worker URL and secret code
7. Run `wrangler tail` and click save. You should see:

```
GET https://[your-worker-url].workers.dev/?hub.mode=subscribe&hub.challenge=[challenge-code]&hub.verify_token=[your-verify-token] - Ok @ [date-time]
```
## AI Setup 
- `services/openai.js` and `tools.js` help the AI work
- AI can use many tools at the same time
- Add your `OPENAI_API_KEY` to the worker

## Whatsapp Adapters
- `adapters/whatsapp.js` helps you talk to WhatsApp
- Send text messages
- Send images and files 
- Get messages from users
- Download voice messages


