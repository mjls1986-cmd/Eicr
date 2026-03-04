import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { EICRFormData } from "./types";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 20,
    borderBottom: "2 solid #1a365d",
    paddingBottom: 15,
  },
  brandName: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1a365d",
    marginBottom: 5,
  },
  title: {
    fontSize: 16,
    color: "#2d3748",
    fontWeight: "bold",
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    backgroundColor: "#e2e8f0",
    padding: 8,
    marginBottom: 8,
    color: "#1a365d",
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  label: {
    width: "35%",
    fontWeight: "bold",
    color: "#4a5568",
  },
  value: {
    width: "65%",
    color: "#1a202c",
  },
  table: {
    width: "100%",
    marginTop: 5,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#1a365d",
    color: "#ffffff",
    padding: 6,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1 solid #e2e8f0",
    padding: 5,
  },
  tableRowAlt: {
    flexDirection: "row",
    borderBottom: "1 solid #e2e8f0",
    padding: 5,
    backgroundColor: "#f7fafc",
  },
  // Circuit table columns
  circuitCol1: { width: "8%" },
  circuitCol2: { width: "22%" },
  circuitCol3: { width: "25%" },
  circuitCol4: { width: "15%" },
  circuitCol5: { width: "15%" },
  circuitCol6: { width: "15%" },
  // Observation table columns
  obsCol1: { width: "15%" },
  obsCol2: { width: "65%" },
  obsCol3: { width: "20%" },
  overallCondition: {
    marginTop: 20,
    marginBottom: 20,
    padding: 15,
    borderRadius: 4,
    alignItems: "center",
  },
  satisfactory: {
    backgroundColor: "#c6f6d5",
    borderColor: "#38a169",
    borderWidth: 2,
  },
  unsatisfactory: {
    backgroundColor: "#fed7d7",
    borderColor: "#e53e3e",
    borderWidth: 2,
  },
  conditionText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  conditionSubtext: {
    fontSize: 10,
    marginTop: 5,
    color: "#4a5568",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    borderTop: "1 solid #e2e8f0",
    paddingTop: 10,
  },
  footerText: {
    fontSize: 8,
    color: "#718096",
    textAlign: "center",
    marginBottom: 2,
  },
  severityC1: {
    color: "#e53e3e",
    fontWeight: "bold",
  },
  severityC2: {
    color: "#dd6b20",
    fontWeight: "bold",
  },
  severityC3: {
    color: "#38a169",
    fontWeight: "bold",
  },
  boardInfo: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  boardInfoItem: {
    width: "50%",
    marginBottom: 4,
    flexDirection: "row",
  },
  rcdSection: {
    marginTop: 10,
    marginBottom: 10,
  },
  rcdItem: {
    flexDirection: "row",
    padding: 4,
    backgroundColor: "#f7fafc",
    marginBottom: 2,
  },
});

function getSeverityStyle(severity: string) {
  switch (severity) {
    case "C1":
      return styles.severityC1;
    case "C2":
      return styles.severityC2;
    case "C3":
      return styles.severityC3;
    default:
      return {};
  }
}

function getSeverityLabel(severity: string): string {
  switch (severity) {
    case "C1":
      return "C1 - Danger Present";
    case "C2":
      return "C2 - Potentially Dangerous";
    case "C3":
      return "C3 - Improvement Recommended";
    default:
      return severity;
  }
}

function hasUnsatisfactoryConditions(data: EICRFormData): boolean {
  return data.analysis.observations.some(
    (obs) => obs.severity === "C1" || obs.severity === "C2"
  );
}

interface EICRDocumentProps {
  data: EICRFormData;
}

export function EICRDocument({ data }: EICRDocumentProps) {
  const isUnsatisfactory = hasUnsatisfactoryConditions(data);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.brandName}>CertAI</Text>
          <Text style={styles.title}>Electrical Installation Condition Report</Text>
        </View>

        {/* Client Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Client Name:</Text>
            <Text style={styles.value}>{data.client_name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Client Address:</Text>
            <Text style={styles.value}>{data.client_address}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Installation Address:</Text>
            <Text style={styles.value}>{data.installation_address}</Text>
          </View>
        </View>

        {/* Electrician Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Inspector Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Inspector Name:</Text>
            <Text style={styles.value}>{data.inspector_name}</Text>
          </View>
        </View>

        {/* Installation Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Installation Details</Text>
          <View style={styles.boardInfo}>
            <View style={styles.boardInfoItem}>
              <Text style={styles.label}>Inspection Date:</Text>
              <Text style={styles.value}>{data.inspection_date}</Text>
            </View>
            <View style={styles.boardInfoItem}>
              <Text style={styles.label}>Next Inspection:</Text>
              <Text style={styles.value}>{data.next_inspection_date}</Text>
            </View>
            <View style={styles.boardInfoItem}>
              <Text style={styles.label}>Manufacturer:</Text>
              <Text style={styles.value}>{data.analysis.manufacturer}</Text>
            </View>
            <View style={styles.boardInfoItem}>
              <Text style={styles.label}>Main Switch:</Text>
              <Text style={styles.value}>{data.analysis.main_switch_amps}A</Text>
            </View>
          </View>

          {/* RCDs */}
          {data.analysis.rcds.length > 0 && (
            <View style={styles.rcdSection}>
              <Text style={{ fontWeight: "bold", marginBottom: 4 }}>RCD Protection:</Text>
              {data.analysis.rcds.map((rcd, index) => (
                <View key={index} style={styles.rcdItem}>
                  <Text style={{ width: "30%" }}>Position: {rcd.position}</Text>
                  <Text style={{ width: "35%" }}>Type: {rcd.type}</Text>
                  <Text style={{ width: "35%" }}>Rating: {rcd.rating_ma}mA</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Circuit Schedule Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Circuit Schedule</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.circuitCol1}>No.</Text>
              <Text style={styles.circuitCol2}>Circuit Type</Text>
              <Text style={styles.circuitCol3}>Label</Text>
              <Text style={styles.circuitCol4}>Rating</Text>
              <Text style={styles.circuitCol5}>RCD</Text>
            </View>
            {data.analysis.circuits.map((circuit, index) => (
              <View
                key={index}
                style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
              >
                <Text style={styles.circuitCol1}>{circuit.position}</Text>
                <Text style={styles.circuitCol2}>{circuit.type}</Text>
                <Text style={styles.circuitCol3}>{circuit.label}</Text>
                <Text style={styles.circuitCol4}>{circuit.rating_amps}A</Text>
                <Text style={styles.circuitCol5}>
                  {circuit.rcd_protected ? "Yes" : "No"}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Observations Table */}
        {data.analysis.observations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Observations</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.obsCol1}>Code</Text>
                <Text style={styles.obsCol2}>Description</Text>
                <Text style={styles.obsCol3}>Severity</Text>
              </View>
              {data.analysis.observations.map((obs, index) => (
                <View
                  key={index}
                  style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
                >
                  <Text style={styles.obsCol1}>{obs.code}</Text>
                  <Text style={styles.obsCol2}>{obs.description}</Text>
                  <Text style={[styles.obsCol3, getSeverityStyle(obs.severity)]}>
                    {getSeverityLabel(obs.severity)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Overall Condition */}
        <View
          style={[
            styles.overallCondition,
            isUnsatisfactory ? styles.unsatisfactory : styles.satisfactory,
          ]}
        >
          <Text
            style={[
              styles.conditionText,
              { color: isUnsatisfactory ? "#c53030" : "#276749" },
            ]}
          >
            Overall Condition: {isUnsatisfactory ? "UNSATISFACTORY" : "SATISFACTORY"}
          </Text>
          <Text style={styles.conditionSubtext}>
            {isUnsatisfactory
              ? "This installation requires remedial work before it can be considered safe."
              : "This installation is considered safe for continued use."}
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            This report has been prepared in accordance with BS 7671 - Requirements for
            Electrical Installations (IET Wiring Regulations).
          </Text>
          <Text style={styles.footerText}>
            Generated by CertAI - Electrical Installation Condition Report System
          </Text>
          <Text style={styles.footerText}>
            Report generated on: {new Date().toLocaleDateString("en-GB")}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
