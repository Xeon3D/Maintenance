import type { ChecklistItemType, SystemType } from "@/generated/prisma/enums";

// Starter procedures for villa systems integrators, in both UI languages.
// Installed on demand from the Procedures page; companies then adapt them.

type L = { en: string; pt: string };
type TItem = { type: ChecklistItemType; label: L; required?: boolean; unit?: string; options?: { en: string[]; pt: string[] } };
export type ProcedureTemplate = { key: string; system: SystemType; name: L; description: L; items: TItem[] };

const PASS: ChecklistItemType = "PASS_FAIL";
const h = (en: string, pt: string): TItem => ({ type: "HEADING", label: { en, pt } });
const pf = (en: string, pt: string, required = true): TItem => ({ type: PASS, label: { en, pt }, required });
const num = (en: string, pt: string, unit: string, type: ChecklistItemType = "NUMBER"): TItem => ({ type, label: { en, pt }, unit, required: true });
const photo = (en: string, pt: string): TItem => ({ type: "PHOTO", label: { en, pt } });
const text = (en: string, pt: string): TItem => ({ type: "TEXT", label: { en, pt } });

export const PROCEDURE_TEMPLATES: ProcedureTemplate[] = [
  {
    key: "cctv-quarterly",
    system: "CCTV",
    name: { en: "CCTV quarterly health check", pt: "Verificação trimestral de CCTV" },
    description: { en: "Recorder, storage and camera image checks.", pt: "Verificação do gravador, armazenamento e imagem das câmaras." },
    items: [
      h("Recorder (NVR)", "Gravador (NVR)"),
      pf("All disks healthy, no S.M.A.R.T. warnings", "Todos os discos em bom estado, sem alertas S.M.A.R.T."),
      num("Recording retention", "Retenção de gravação", "days"),
      pf("Recording continuous on all channels (check last 72 h timeline)", "Gravação contínua em todos os canais (ver últimas 72 h)"),
      pf("Time synchronised (NTP)", "Hora sincronizada (NTP)"),
      { type: "MULTIPLE_CHOICE", label: { en: "Firmware", pt: "Firmware" }, options: { en: ["Up to date", "Updated today", "Update pending"], pt: ["Atualizado", "Atualizado hoje", "Atualização pendente"] } },
      h("Cameras", "Câmaras"),
      pf("Image clear on all cameras, day mode", "Imagem nítida em todas as câmaras, modo dia"),
      pf("IR / night mode working", "IV / modo noturno a funcionar"),
      pf("Lenses and housings cleaned", "Lentes e caixas limpas"),
      pf("Motion / line-crossing events reaching the app", "Eventos de movimento / linha a chegar à app"),
      photo("Photo of the multi-camera view", "Fotografia da vista multicâmara"),
      text("Notes for the client", "Notas para o cliente"),
    ],
  },
  {
    key: "network-rack",
    system: "NETWORK",
    name: { en: "Network rack inspection", pt: "Inspeção do bastidor de rede" },
    description: { en: "Rack environment, UPS, core switching and Wi-Fi.", pt: "Ambiente do bastidor, UPS, comutação e Wi-Fi." },
    items: [
      h("Rack", "Bastidor"),
      num("Rack temperature", "Temperatura do bastidor", "°C"),
      pf("Fans working, filters clean", "Ventiladores a funcionar, filtros limpos"),
      pf("Cabling tidy, labels legible", "Cablagem arrumada, etiquetas legíveis"),
      h("UPS", "UPS"),
      num("UPS battery charge", "Carga da bateria da UPS", "%", "METER_READING"),
      num("UPS load", "Carga da UPS", "%"),
      pf("UPS self-test passed", "Autoteste da UPS aprovado"),
      h("Network", "Rede"),
      pf("Internet uplink and failover OK", "Ligação à Internet e failover OK"),
      pf("No switch port errors / PoE budget OK", "Sem erros nas portas / orçamento PoE OK"),
      pf("All access points online", "Todos os pontos de acesso online"),
      num("Wi-Fi speed test in main living area", "Teste de velocidade Wi-Fi na sala principal", "Mbps"),
      pf("Controller and firmware backups taken", "Backups do controlador e firmware efetuados"),
      photo("Photo of the rack", "Fotografia do bastidor"),
    ],
  },
  {
    key: "knx-automation",
    system: "AUTOMATION",
    name: { en: "Home automation (KNX) check", pt: "Verificação de domótica (KNX)" },
    description: { en: "Bus health, scenes, blinds and HVAC integration.", pt: "Estado do bus, cenas, estores e integração AVAC." },
    items: [
      num("KNX bus voltage", "Tensão do bus KNX", "V"),
      pf("No bus errors in the IP router / diagnostics", "Sem erros de bus no router IP / diagnóstico"),
      pf("Scenes run correctly in every room", "Cenas a funcionar em todas as divisões"),
      pf("Blinds and curtains: full travel, limits OK", "Estores e cortinas: curso completo, limites OK"),
      pf("HVAC setpoints respond from keypads and app", "Setpoints AVAC respondem nos teclados e na app"),
      pf("Weather station / timers correct", "Estação meteorológica / horários corretos"),
      pf("ETS project backup up to date", "Backup do projeto ETS atualizado"),
      text("Client requests or changes", "Pedidos ou alterações do cliente"),
    ],
  },
  {
    key: "av-system",
    system: "AV",
    name: { en: "Audio/video system check", pt: "Verificação do sistema de áudio/vídeo" },
    description: { en: "Cinema, multi-room audio and control.", pt: "Cinema, áudio multi-sala e controlo." },
    items: [
      h("Cinema", "Cinema"),
      num("Projector lamp / laser hours", "Horas da lâmpada / laser do projetor", "h", "METER_READING"),
      pf("Image alignment and focus", "Alinhamento e foco da imagem"),
      pf("All sources play (streaming, Blu-ray, TV)", "Todas as fontes funcionam (streaming, Blu-ray, TV)"),
      pf("Surround channels and subwoofer test", "Teste dos canais surround e subwoofer"),
      h("Multi-room audio", "Áudio multi-sala"),
      pf("Every zone plays and groups correctly", "Todas as zonas tocam e agrupam corretamente"),
      pf("Remotes / touch panels respond", "Comandos / painéis táteis respondem"),
      pf("Firmware and apps updated", "Firmware e apps atualizados"),
    ],
  },
  {
    key: "lighting-control",
    system: "LIGHTING",
    name: { en: "Lighting control check", pt: "Verificação do controlo de iluminação" },
    description: { en: "Keypads, scenes, dimming and outdoor lighting.", pt: "Teclados, cenas, regulação e iluminação exterior." },
    items: [
      pf("All keypads and engravings OK", "Todos os teclados e gravações OK"),
      pf("Scenes and dimming smooth, no flicker", "Cenas e regulação suaves, sem cintilação"),
      pf("Astronomical timers / garden lighting correct", "Horários astronómicos / iluminação de jardim corretos"),
      pf("Pool and landscape fixtures working, seals intact", "Luminárias de piscina e jardim a funcionar, vedantes intactos"),
      num("Failed lamps / drivers replaced", "Lâmpadas / drivers substituídos", "pcs"),
      photo("Photo of any damaged fixture", "Fotografia de luminárias danificadas"),
    ],
  },
  {
    key: "electrical-board",
    system: "ELECTRICAL",
    name: { en: "Electrical board inspection", pt: "Inspeção do quadro elétrico" },
    description: { en: "Visual, thermal and protection tests.", pt: "Inspeção visual, térmica e testes de proteção." },
    items: [
      pf("No signs of overheating or damage", "Sem sinais de aquecimento ou danos"),
      num("Hottest connection (thermal camera)", "Ligação mais quente (câmara térmica)", "°C"),
      pf("RCD test button trips every device", "Botão de teste dispara todos os diferenciais"),
      pf("Surge protector status OK", "Descarregador de sobretensões OK"),
      pf("Circuit labels legible and up to date", "Identificação dos circuitos legível e atualizada"),
      pf("Generator / transfer switch test run", "Teste do gerador / comutador de transferência", false),
      photo("Photo of the board", "Fotografia do quadro"),
    ],
  },
  {
    key: "security-alarm",
    system: "SECURITY",
    name: { en: "Intrusion alarm test", pt: "Teste do alarme de intrusão" },
    description: { en: "Detectors, sirens, batteries and monitoring.", pt: "Detetores, sirenes, baterias e central de monitorização." },
    items: [
      pf("Monitoring centre notified before test", "Central de monitorização avisada antes do teste"),
      pf("All detectors walk-tested", "Todos os detetores testados"),
      pf("Door/window contacts tested", "Contactos de portas/janelas testados"),
      pf("Internal and external sirens OK", "Sirenes interiores e exteriores OK"),
      num("Panel backup battery voltage", "Tensão da bateria da central", "V", "METER_READING"),
      pf("Test signal received by monitoring centre", "Sinal de teste recebido pela central"),
      pf("Monitoring centre informed test is over", "Central informada do fim do teste"),
    ],
  },
];

export function localizeTemplate(t: ProcedureTemplate, locale: "en" | "pt") {
  return {
    name: t.name[locale],
    description: t.description[locale],
    system: t.system,
    items: t.items.map((i, sortOrder) => ({
      sortOrder,
      type: i.type,
      label: i.label[locale],
      required: i.required ?? false,
      unit: i.unit ?? null,
      options: i.options?.[locale] ?? [],
    })),
  };
}
