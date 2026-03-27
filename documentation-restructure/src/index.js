import { createApp } from "./app.js";

const app = createApp();
const port = Number(process.env.PORT) || 3000;

app.listen(port, () => {
  console.log(`Validation-first MVP Constructor listening on port ${port}`);
});
