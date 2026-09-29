import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { PdfFooter, PdfHeader } from "@/components/pdf/letterhead";
import type { Letterhead } from "@/lib/letterhead";

// Vendor-facing purchase order. Money values arrive pre-formatted in the org's currency and locale.

export type PoPdfData = {
  labels: Record<string, string>;
  lh: Letterhead;
  number: number;
  date: string;
  vendor: { name: string; lines: string[] };
  shipTo: string | null;
  expected: string | null;
  lines: { description: string; sku: string | null; qty: string; unitCost: string; total: string }[];
  totals: [string, string][];
  total: string;
  notes: string | null;
};

const s = StyleSheet.create({
  page: { padding: 36, paddingBottom: 54, fontSize: 9.5, fontFamily: "Helvetica", color: "#16181d" },
  muted: { color: "#6b7280" },
  label: { fontSize: 8, color: "#6b7280", textTransform: "uppercase", marginBottom: 3 },
  bold: { fontFamily: "Helvetica-Bold" },
  row: { flexDirection: "row", borderBottom: "0.5pt solid #e5e7eb", paddingVertical: 5 },
  th: { flexDirection: "row", borderBottom: "1pt solid #16181d", paddingVertical: 4, fontFamily: "Helvetica-Bold", fontSize: 8.5 },
});

const COL = { desc: { width: "52%" }, qty: { width: "12%", textAlign: "right" as const }, cost: { width: "18%", textAlign: "right" as const }, total: { width: "18%", textAlign: "right" as const } };

export function PurchaseOrderPdf({ d }: { d: PoPdfData }) {
  const L = d.labels;
  return (
    <Document title={`${L.title} PO-${d.number}`} author={d.lh.name}>
      <Page size="A4" style={s.page}>
        <PdfHeader lh={d.lh} title={L.title} reference={`PO-${d.number}`} date={d.date} />

        <View style={{ flexDirection: "row", marginBottom: 18 }}>
          <View style={{ width: "50%", paddingRight: 12 }}>
            <Text style={s.label}>{L.vendor}</Text>
            <Text style={s.bold}>{d.vendor.name}</Text>
            {d.vendor.lines.map((l, i) => (
              <Text key={i}>{l}</Text>
            ))}
          </View>
          <View style={{ width: "50%" }}>
            {d.shipTo && (
              <View style={{ marginBottom: 8 }}>
                <Text style={s.label}>{L.shipTo}</Text>
                <Text>{d.shipTo}</Text>
              </View>
            )}
            {d.expected && (
              <View>
                <Text style={s.label}>{L.expected}</Text>
                <Text>{d.expected}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={s.th}>
          <Text style={COL.desc}>{L.item}</Text>
          <Text style={COL.qty}>{L.qty}</Text>
          <Text style={COL.cost}>{L.unitCost}</Text>
          <Text style={COL.total}>{L.lineTotal}</Text>
        </View>
        {d.lines.map((l, i) => (
          <View key={i} style={s.row} wrap={false}>
            <View style={COL.desc}>
              <Text>{l.description}</Text>
              {l.sku && <Text style={s.muted}>{l.sku}</Text>}
            </View>
            <Text style={COL.qty}>{l.qty}</Text>
            <Text style={COL.cost}>{l.unitCost}</Text>
            <Text style={COL.total}>{l.total}</Text>
          </View>
        ))}

        <View style={{ alignSelf: "flex-end", width: "40%", marginTop: 8 }} wrap={false}>
          {d.totals.map(([k, v]) => (
            <View key={k} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}>
              <Text style={s.muted}>{k}</Text>
              <Text>{v}</Text>
            </View>
          ))}
          <View style={{ flexDirection: "row", justifyContent: "space-between", borderTop: "1pt solid #16181d", marginTop: 3, paddingTop: 4 }}>
            <Text style={s.bold}>{L.total}</Text>
            <Text style={s.bold}>{d.total}</Text>
          </View>
        </View>

        {d.notes && (
          <View style={{ marginTop: 20 }} wrap={false}>
            <Text style={s.label}>{L.notes}</Text>
            <Text>{d.notes}</Text>
          </View>
        )}

        <PdfFooter lh={d.lh} label={`${L.title} PO-${d.number}`} />
      </Page>
    </Document>
  );
}
