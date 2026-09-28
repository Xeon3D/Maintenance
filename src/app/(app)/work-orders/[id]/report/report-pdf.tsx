/* eslint-disable jsx-a11y/alt-text -- react-pdf <Image> is not an HTML img and has no alt prop */
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

// Client-facing service report. Internal costs are deliberately left out.

export type ReportData = {
  labels: Record<string, string>;
  org: string;
  number: number;
  title: string;
  generatedAt: string;
  info: [string, string][];
  description: string | null;
  checklist: { label: string; heading: boolean; answer: string; note: string | null; image: Buffer | null }[];
  time: { who: string; when: string; duration: string; note: string | null }[];
  totalTime: string;
  photos: Buffer[];
  signature: { image: Buffer; name: string; at: string } | null;
};

const s = StyleSheet.create({
  page: { padding: 36, fontSize: 9.5, fontFamily: "Helvetica", color: "#16181d" },
  header: { flexDirection: "row", justifyContent: "space-between", borderBottom: "1.5pt solid #1f4f8f", paddingBottom: 10, marginBottom: 14 },
  org: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#1f4f8f" },
  docTitle: { fontSize: 16, fontFamily: "Helvetica-Bold", marginTop: 4 },
  muted: { color: "#6b7280" },
  h2: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 16, marginBottom: 6 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: "50%", paddingVertical: 3, paddingRight: 8, flexDirection: "row" },
  key: { width: 90, color: "#6b7280" },
  row: { flexDirection: "row", borderBottom: "0.5pt solid #e5e7eb", paddingVertical: 4 },
  heading: { fontFamily: "Helvetica-Bold", backgroundColor: "#f3f4f6", paddingVertical: 4, paddingHorizontal: 4, marginTop: 4 },
  photos: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  photo: { width: 170, height: 128, objectFit: "cover", borderRadius: 3 },
  footer: { position: "absolute", bottom: 20, left: 36, right: 36, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: "#9ca3af" },
});

export function ServiceReport({ d }: { d: ReportData }) {
  const L = d.labels;
  return (
    <Document title={`${L.reportTitle} #${d.number}`} author={d.org}>
      <Page size="A4" style={s.page}>
        <View style={s.header} fixed>
          <View>
            <Text style={s.org}>{d.org}</Text>
            <Text style={s.docTitle}>{L.reportTitle}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 13, fontFamily: "Helvetica-Bold" }}>#{d.number}</Text>
            <Text style={s.muted}>{d.generatedAt}</Text>
          </View>
        </View>

        <Text style={{ fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 8 }}>{d.title}</Text>
        <View style={s.grid}>
          {d.info.map(([k, v]) => (
            <View key={k} style={s.cell}>
              <Text style={s.key}>{k}</Text>
              <Text style={{ flex: 1 }}>{v}</Text>
            </View>
          ))}
        </View>

        {d.description && (
          <>
            <Text style={s.h2}>{L.description}</Text>
            <Text>{d.description}</Text>
          </>
        )}

        {d.checklist.length > 0 && (
          <>
            <Text style={s.h2}>{L.checklist}</Text>
            {d.checklist.map((c, i) =>
              c.heading ? (
                <Text key={i} style={s.heading}>
                  {c.label}
                </Text>
              ) : (
                <View key={i} style={s.row} wrap={false}>
                  <Text style={{ width: "55%", paddingRight: 8 }}>{c.label}</Text>
                  <View style={{ width: "45%" }}>
                    {c.image ? <Image src={{ data: c.image, format: "png" }} style={{ height: 50, objectFit: "contain" }} /> : <Text>{c.answer}</Text>}
                    {c.note && <Text style={s.muted}>{c.note}</Text>}
                  </View>
                </View>
              ),
            )}
          </>
        )}

        {d.time.length > 0 && (
          <>
            <Text style={s.h2}>{L.time}</Text>
            {d.time.map((e, i) => (
              <View key={i} style={s.row}>
                <Text style={{ width: "30%" }}>{e.who}</Text>
                <Text style={{ width: "25%" }}>{e.when}</Text>
                <Text style={{ width: "30%" }} >{e.note ?? ""}</Text>
                <Text style={{ width: "15%", textAlign: "right" }}>{e.duration}</Text>
              </View>
            ))}
            <View style={[s.row, { borderBottom: 0 }]}>
              <Text style={{ width: "85%", fontFamily: "Helvetica-Bold" }}>{L.total}</Text>
              <Text style={{ width: "15%", textAlign: "right", fontFamily: "Helvetica-Bold" }}>{d.totalTime}</Text>
            </View>
          </>
        )}

        {d.photos.length > 0 && (
          <>
            <Text style={s.h2}>{L.photos}</Text>
            <View style={s.photos}>
              {d.photos.map((p, i) => (
                <Image key={i} src={{ data: p, format: p[0] === 0x89 ? "png" : "jpg" }} style={s.photo} />
              ))}
            </View>
          </>
        )}

        {d.signature && (
          <View wrap={false}>
            <Text style={s.h2}>{L.signoff}</Text>
            <Image src={{ data: d.signature.image, format: "png" }} style={{ width: 200, height: 80, objectFit: "contain" }} />
            <Text style={{ marginTop: 4, fontFamily: "Helvetica-Bold" }}>{d.signature.name}</Text>
            <Text style={s.muted}>{d.signature.at}</Text>
          </View>
        )}

        <View style={s.footer} fixed>
          <Text>
            {d.org} · {L.reportTitle} #{d.number}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
