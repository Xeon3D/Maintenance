/* eslint-disable jsx-a11y/alt-text -- react-pdf <Image> is not an HTML img and has no alt prop */
import { Image, Text, View } from "@react-pdf/renderer";
import type { Letterhead } from "@/lib/letterhead";

// Company letterhead and footer shared by the PDF documents (service report, purchase order).
// Fixed: repeated on every page.

export function PdfHeader({ lh, title, reference, date }: { lh: Letterhead; title: string; reference: string; date: string }) {
  return (
    <View fixed style={{ flexDirection: "row", justifyContent: "space-between", borderBottom: `1.5pt solid ${lh.color}`, paddingBottom: 10, marginBottom: 14 }}>
      <View style={{ flexDirection: "row", maxWidth: "65%" }}>
        {lh.logo && <Image src={{ data: lh.logo.data, format: lh.logo.format }} style={{ height: 40, maxWidth: 110, objectFit: "contain", marginRight: 10 }} />}
        <View>
          <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: lh.color }}>{lh.name}</Text>
          {lh.lines.map((l, i) => (
            <Text key={i} style={{ fontSize: 7.5, color: "#6b7280" }}>
              {l}
            </Text>
          ))}
        </View>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={{ fontSize: 14, fontFamily: "Helvetica-Bold" }}>{title}</Text>
        <Text style={{ fontSize: 12, fontFamily: "Helvetica-Bold", marginTop: 2 }}>{reference}</Text>
        <Text style={{ color: "#6b7280" }}>{date}</Text>
      </View>
    </View>
  );
}

export function PdfFooter({ lh, label }: { lh: Letterhead; label: string }) {
  return (
    <View fixed style={{ position: "absolute", bottom: 18, left: 36, right: 36, fontSize: 7.5, color: "#9ca3af" }}>
      {lh.footer && <Text style={{ marginBottom: 3, textAlign: "center" }}>{lh.footer}</Text>}
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text>
          {lh.name} · {label}
        </Text>
        <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </View>
    </View>
  );
}
