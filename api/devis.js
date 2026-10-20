const SERVICE_LABELS = {
  kit: "Kit pneus hiver",
  tires: "Pneus hiver",
  charger: "Chargeur",
  cradle: "Tire Cradle"
};

const clip = (value, max) => String(value ?? "").trim().slice(0, max);

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const { NOTION_TOKEN, NOTION_DATABASE_ID } = process.env;
  if (!NOTION_TOKEN || !NOTION_DATABASE_ID) {
    return res.status(500).json({ error: "missing_configuration" });
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const firstName = clip(body.firstName, 100);
  const lastName = clip(body.lastName, 100);
  const email = clip(body.email, 200);
  const phone = clip(body.phone, 50);
  const model = clip(body.model, 200);
  const lang = body.lang === "nl" ? "NL" : "FR";
  const services = (Array.isArray(body.services) ? body.services : [])
    .map((key) => SERVICE_LABELS[key])
    .filter(Boolean);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!firstName || !lastName || !emailOk || !phone || !model || services.length === 0) {
    return res.status(400).json({ error: "invalid_input" });
  }

  const notionRes = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28"
    },
    body: JSON.stringify({
      parent: { database_id: NOTION_DATABASE_ID },
      properties: {
        Client: { title: [{ text: { content: `${firstName} ${lastName}` } }] },
        Statut: { select: { name: "Nouveau" } },
        Services: { multi_select: services.map((name) => ({ name })) },
        "Modèle Ferrari": { rich_text: [{ text: { content: model } }] },
        Email: { email },
        Téléphone: { phone_number: phone },
        Langue: { select: { name: lang } }
      }
    })
  });

  if (!notionRes.ok) {
    return res.status(502).json({ error: "notion_error" });
  }
  return res.status(200).json({ ok: true });
};
