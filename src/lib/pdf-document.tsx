import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { EICRFormData } from "./types";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 9, fontFamily: "Helvetica" },
  header: { marginBottom: 16, borderBottom: "2 solid #1a365d", paddingBottom: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  brandName: { fontSize: 22, fontWeight: "bold", color: "#1a365d" },
  title: { fontSize: 13, color: "#2d3748", fontWeight: "bold", marginTop: 2 },
  headerRight: { textAlign: "right" },
  headerMeta: { fontSize: 8, color: "#718096" },
  section: { marginBottom: 12 },
  sectionTitle: { fontSize: 10, fontWeight: "bold", backgroundColor: "#e2e8f0", padding: 6, marginBottom: 6, color: "#1a365d" },
  row: { flexDirection: "row", marginBottom: 3 },
  label: { width: "35%", fontWeight: "bold", color: "#4a5568" },
  value: { width: "65%", color: "#1a202c" },
  grid2: { flexDirection: "row", flexWrap: "wrap" },
  gridItem: { width: "50%", flexDirection: "row", marginBottom: 3 },
  table: { width: "100%", marginTop: 4 },
  tableHeader: { flexDirection: "row", backgroundColor: "#1a365d", color: "#ffffff", padding: 5, fontWeight: "bold" },
  tableRow: { flexDirection: "row", borderBottom: "1 solid #e2e8f0", padding: 4 },
  tableRowAlt: { flexDirection: "row", borderBottom: "1 solid #e2e8f0", padding: 4, backgroundColor: "#f7fafc" },
  tableRowFail: { flexDirection: "row", borderBottom: "1 solid #fed7d7", padding: 4, backgroundColor: "#fff5f5" },
  cPos: { width: "4%" }, cType: { width: "10%" }, cLabel: { width: "18%" },
  cRating: { width: "7%" }, cRcd: { width: "6%" },
  cIrLE: { width: "8%" }, cIrLN: { width: "8%" }, cIrNE: { width: "8%" },
  cZs: { width: "8%" }, cR1R2: { width: "8%" }, cRcdT: { width: "8%" }, cResult: { width: "7%" },
  obsCol1: { width: "12%" }, obsCol2: { width: "68%" }, obsCol3: { width: "20%" },
  overallBox: { marginTop: 16, marginBottom: 16, padding: 12, borderRadius: 4, alignItems: "center" },
  satisfactory: { backgroundColor: "#c6f6d5", borderColor: "#38a169", borderWidth: 2 },
  unsatisfactory: { backgroundColor: "#fed7d7", borderColor: "#e53e3e", borderWidth: 2 },
  conditionText: { fontSize: 14, fontWeight: "bold" },
  conditionSubtext: { fontSize: 8, marginTop: 4, color: "#4a5568" },
  footer: { position: "absolute", bottom: 25, left: 40, right: 40, borderTop: "1 solid #e2e8f0", paddingTop: 8 },
  footerText: { fontSize: 7, color: "#718096", textAlign: "center", marginBottom: 1 },
  severityC1: { color: "#e53e3e", fontWeight: "bold" },
  severityC2: { color: "#dd6b20", fontWeight: "bold" },
  severityC3: { color: "#38a169" },
  passText: { color: "#38a169", fontWeight: "bold" },
  failText: { color: "#e53e3e", fontWeight: "bold" },
  naText: { color: "#a0aec0" },
  testSummaryRow: { flexDirection: "row", gap: 20, marginBottom: 8 },
  testStat: { alignItems: "center" },
  testStatVal: { fontSize: 18, fontWeight: "bold" },
  testStatLabel: { fontSize: 7, color: "#718096" },
});

function fmt(val?: number, decimals = 2): string {
  if (val === undefined || val === null) return "—";
  return val.toFixed(decimals);
}

function getSeverityStyle(s: string) {
  if (s === "C1") return styles.severityC1;
  if (s === "C2") return styles.severityC2;
  return styles.severityC3;
}

function getSeverityLabel(s: string): string {
  if (s === "C1") return "C1 – Danger";
  if (s === "C2") return "C2 – Potentially Dangerous";
  if (s === "C3") return "C3 – Improvement";
  return s;
}

function hasUnsatisfactory(data: EICRFormData): boolean {
  return (
    data.analysis.observations.some(o => o.severity === "C1" || o.severity === "C2") ||
    data.analysis.circuits.some(c => c.validation_failures && c.validation_failures.length > 0)
  );
}

export function EICRDocument({ data }: { data: EICRFormData }) {
  const isUnsat = hasUnsatisfactory(data);
  const circuits = data.analysis.circuits;
  const tested = circuits.filter(c => c.test_results && Object.keys(c.test_results).length > 0);
  const failed = circuits.filter(c => c.validation_failures && c.validation_failures.length > 0);

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>

        <View style={styles.header}>
          <View>
            <Text style={styles.brandName}>CertAI</Text>
            <Text style={styles.title}>Electrical Installation Condition Report</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerMeta}>BS 7671:2018+A2:2022</Text>
            <Text style={styles.headerMeta}>Date: {data.inspection_date}</Text>
            <Text style={styles.headerMeta}>Next: {data.next_inspection_date}</Text>
          </View>
        </View>

        <View style={[styles.grid2, { marginBottom: 10 }]}>
          <View style={{ width: "33%" }}>
            <Text style={styles.sectionTitle}>Client</Text>
            <View style={styles.row}><Text style={styles.label}>Name:</Text><Text style={styles.value}>{data.client_name}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Address:</Text><Text style={styles.value}>{data.client_address}</Text></View>
            {data.installation_address && (
              <View style={styles.row}><Text style={styles.label}>Installation:</Text><Text style={styles.value}>{data.installation_address}</Text></View>
            )}
          </View>
          <View style={{ width: "33%", paddingLeft: 10 }}>
            <Text style={styles.sectionTitle}>Inspector</Text>
            <View style={styles.row}><Text style={styles.label}>Name:</Text><Text style={styles.value}>{data.inspector_name}</Text></View>
            {data.inspector_number && (
              <View style={styles.row}><Text style={styles.label}>Cert No:</Text><Text style={styles.value}>{data.inspector_number}</Text></View>
            )}
            {data.purpose_of_report && (
              <View style={styles.row}><Text style={styles.label}>Purpose:</Text><Text style={styles.value}>{data.purpose_of_report}</Text></View>
            )}
          </View>
          <View style={{ width: "33%", paddingLeft: 10 }}>
            <Text style={styles.sectionTitle}>Installation</Text>
            <View style={styles.row}><Text style={styles.label}>Board:</Text><Text style={styles.value}>{data.analysis.manufacturer}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Main Switch:</Text><Text style={styles.value}>{data.analysis.main_switch_amps}A</Text></View>
            {data.analysis.system_type && (
              <View style={styles.row}><Text style={styles.label}>System:</Text><Text style={styles.value}>{data.analysis.system_type}</Text></View>
            )}
          </View>
        </View>

        {tested.length > 0 && (
          <View style={[styles.testSummaryRow, { marginBottom: 6 }]}>
            {[
              { val: circuits.length, label: "Circuits", color: "#1a202c" },
              { val: tested.length, label: "Tested", color: "#3182ce" },
              { val: tested.length - failed.length, label: "Passed", color: "#38a169" },
              { val: failed.length, label: "Failed", color: failed.length > 0 ? "#e53e3e" : "#a0aec0" },
            ].map(({ val, label, color }) => (
              <View key={label} style={styles.testStat}>
                <Text style={[styles.testStatVal, { color }]}>{val}</Text>
                <Text style={styles.testStatLabel}>{label}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Circuit Schedule & Test Results (BS 7671 limits applied)</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.cPos}>No</Text>
              <Text style={styles.cType}>Type</Text>
              <Text style={styles.cLabel}>Label</Text>
              <Text style={styles.cRating}>A</Text>
              <Text style={styles.cRcd}>RCD</Text>
              <Text style={styles.cIrLE}>IR L-E MΩ</Text>
              <Text style={styles.cIrLN}>IR L-N MΩ</Text>
              <Text style={styles.cIrNE}>IR N-E MΩ</Text>
              <Text style={styles.cZs}>Zs Ω</Text>
              <Text style={styles.cR1R2}>R1+R2 Ω</Text>
              <Text style={styles.cRcdT}>RCD ms</Text>
              <Text style={styles.cResult}>Result</Text>
            </View>
            {circuits.map((c, i) => {
              const hasFail = c.validation_failures && c.validation_failures.length > 0;
              const tr = c.test_results;
              const hasData = tr && Object.keys(tr).length > 0;
              const rowStyle = hasFail ? styles.tableRowFail : i % 2 === 0 ? styles.tableRow : styles.tableRowAlt;
              return (
                <View key={i} style={rowStyle}>
                  <Text style={styles.cPos}>{c.position}</Text>
                  <Text style={styles.cType}>{c.type}</Text>
                  <Text style={styles.cLabel}>{c.label}</Text>
                  <Text style={styles.cRating}>{c.rating_amps}</Text>
                  <Text style={styles.cRcd}>{c.rcd_protected ? "Y" : "N"}</Text>
                  <Text style={styles.cIrLE}>{fmt(tr?.ir_live_earth)}</Text>
                  <Text style={styles.cIrLN}>{fmt(tr?.ir_live_neutral)}</Text>
                  <Text style={styles.cIrNE}>{fmt(tr?.ir_neutral_earth)}</Text>
                  <Text style={styles.cZs}>{fmt(tr?.zs)}</Text>
                  <Text style={styles.cR1R2}>{fmt(tr?.r1_r2)}</Text>
                  <Text style={styles.cRcdT}>{c.rcd_protected ? fmt(tr?.rcd_trip_time, 0) : "N/A"}</Text>
                  <Text style={[styles.cResult, hasFail ? styles.failText : hasData ? styles.passText : styles.naText]}>
                    {hasFail ? "FAIL" : hasData ? "PASS" : "—"}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {data.analysis.observations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Observations & Defects</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.obsCol1}>Ref</Text>
                <Text style={styles.obsCol2}>Description</Text>
                <Text style={styles.obsCol3}>Classification</Text>
              </View>
              {data.analysis.observations.map((obs, i) => (
                <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                  <Text style={styles.obsCol1}>{obs.code}</Text>
                  <Text style={styles.obsCol2}>{obs.description}</Text>
                  <Text style={[styles.obsCol3, getSeverityStyle(obs.severity)]}>{getSeverityLabel(obs.severity)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={[styles.overallBox, isUnsat ? styles.unsatisfactory : styles.satisfactory]}>
          <Text style={[styles.conditionText, { color: isUnsat ? "#c53030" : "#276749" }]}>
            Overall Condition: {isUnsat ? "UNSATISFACTORY" : "SATISFACTORY"}
          </Text>
          <Text style={styles.conditionSubtext}>
            {isUnsat
              ? "This installation requires remedial work. See observations above."
              : "This installation is considered safe for continued use."}
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Prepared in accordance with BS 7671:2018+A2:2022 (IET Wiring Regulations 18th Edition). Generated by CertAI on {new Date().toLocaleDateString("en-GB")}.
          </Text>
        </View>

      </Page>
    </Document>
  );
}
