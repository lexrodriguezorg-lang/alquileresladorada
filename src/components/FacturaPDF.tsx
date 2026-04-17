import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Font,
  pdf,
} from '@react-pdf/renderer'

// ------------------------------------------------------------------
// Tipografía (Outfit desde CDN — jsdelivr sirve .ttf directo)
// ------------------------------------------------------------------
Font.register({
  family: 'Outfit',
  fonts: [
    {
      src: 'https://cdn.jsdelivr.net/npm/@fontsource/outfit@5.0.8/files/outfit-latin-400-normal.ttf',
      fontWeight: 400,
    },
    {
      src: 'https://cdn.jsdelivr.net/npm/@fontsource/outfit@5.0.8/files/outfit-latin-500-normal.ttf',
      fontWeight: 500,
    },
    {
      src: 'https://cdn.jsdelivr.net/npm/@fontsource/outfit@5.0.8/files/outfit-latin-700-normal.ttf',
      fontWeight: 700,
    },
    {
      src: 'https://cdn.jsdelivr.net/npm/@fontsource/outfit@5.0.8/files/outfit-latin-800-normal.ttf',
      fontWeight: 800,
    },
  ],
})

// ------------------------------------------------------------------
// Datos del negocio (edítalos según el caso)
// ------------------------------------------------------------------
export const BUSINESS = {
  name: 'Alquileres La Dorada',
  tagline: 'Alquiler de motos y carros · La 14',
  address: 'La Dorada, Caldas — Colombia',
  phone: '+57 300 000 0000',
  email: 'contacto@alquileres-la14.com',
  nit: 'NIT 000.000.000-0',
}

// ------------------------------------------------------------------
// Tipo de contrato para la factura
// ------------------------------------------------------------------
export interface ContractForInvoice {
  contract_number: string
  start_date: string
  end_date: string
  total_amount: number
  deposit: number | null
  rate_type: string
  rate_value: number
  status: string
  notes?: string | null
  client: {
    full_name: string
    document_type?: string | null
    document_number: string
    phone?: string | null
    email?: string | null
    address?: string | null
  } | null
  vehicle: {
    plate: string
    brand: string
    model: string
    year?: number | null
  } | null
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------
const COP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

const formatDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('es-CO') : '—'

function rateUnit(rateType: string): { label: string; days: number } {
  switch (rateType) {
    case 'semanal':
      return { label: 'Semanal', days: 7 }
    case 'mensual':
      return { label: 'Mensual', days: 30 }
    case 'diaria':
    default:
      return { label: 'Diaria', days: 1 }
  }
}

function quantity(start: string, end: string, unitDays: number) {
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  const days = Math.max(1, Math.ceil((e - s) / 86_400_000))
  return Math.max(1, Math.round(days / unitDays))
}

// ------------------------------------------------------------------
// Tokens de color
// ------------------------------------------------------------------
const COLORS = {
  brand: '#E8192C',
  brandDark: '#B01220',
  ink: '#111827',
  inkSoft: '#6B7280',
  inkSofter: '#9CA3AF',
  line: '#E5E7EB',
  surface: '#F9FAFB',
}

// ------------------------------------------------------------------
// Estilos
// ------------------------------------------------------------------
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Outfit',
    fontSize: 10,
    color: COLORS.ink,
    paddingBottom: 90,
  },

  // ---------- Header ----------
  header: {
    backgroundColor: COLORS.brand,
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  brandBlock: { maxWidth: 320 },
  brandEyebrow: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  brandName: {
    color: 'white',
    fontSize: 22,
    fontWeight: 800,
    letterSpacing: 0.2,
    marginTop: 4,
  },
  brandTagline: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 9,
    fontWeight: 500,
    marginTop: 3,
  },
  invoiceMeta: { alignItems: 'flex-end' },
  invoiceLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  invoiceNumber: {
    color: 'white',
    fontSize: 16,
    fontWeight: 800,
    marginTop: 3,
    letterSpacing: 0.5,
  },
  invoiceDate: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 9,
    marginTop: 3,
  },

  // Barra delgada inferior del header (detalle)
  headerAccent: {
    height: 4,
    backgroundColor: COLORS.brandDark,
  },

  // ---------- Contenido ----------
  content: {
    paddingHorizontal: 40,
    paddingTop: 26,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 22,
  },
  metaCol: { flex: 1 },

  sectionTitle: {
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: COLORS.inkSoft,
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 7,
    fontWeight: 500,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: COLORS.inkSofter,
  },
  fieldValue: {
    fontSize: 11,
    fontWeight: 500,
    color: COLORS.ink,
    marginTop: 1,
  },
  fieldValueStrong: {
    fontSize: 12,
    fontWeight: 700,
    color: COLORS.ink,
    marginTop: 1,
  },
  fieldStack: { marginTop: 6 },

  // Caja destacada para el periodo
  periodBox: {
    marginTop: 4,
    marginBottom: 18,
    padding: 14,
    backgroundColor: COLORS.surface,
    border: `1pt solid ${COLORS.line}`,
    borderRadius: 4,
  },
  periodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  periodCol: { flex: 1 },

  // ---------- Tabla de detalle ----------
  table: { marginTop: 18 },
  tableHead: {
    flexDirection: 'row',
    paddingBottom: 6,
    borderBottom: `1pt solid ${COLORS.ink}`,
  },
  tableHeadCell: {
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: COLORS.inkSoft,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottom: `0.5pt solid ${COLORS.line}`,
  },
  tableCell: {
    fontSize: 10,
    color: COLORS.ink,
  },
  colConcept: { flex: 3 },
  colQty: { flex: 1, textAlign: 'right' },
  colUnit: { flex: 1.4, textAlign: 'right' },
  colTotal: { flex: 1.4, textAlign: 'right' },

  // Total grande
  totalBar: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 14,
    paddingHorizontal: 16,
    backgroundColor: COLORS.ink,
    borderRadius: 4,
  },
  totalLabel: {
    fontSize: 10,
    color: 'white',
    fontWeight: 700,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  totalValue: {
    fontSize: 22,
    color: COLORS.brand,
    fontWeight: 800,
    letterSpacing: 0.3,
  },

  // Notas
  notes: {
    marginTop: 22,
    padding: 12,
    backgroundColor: COLORS.surface,
    borderLeft: `3pt solid ${COLORS.brand}`,
  },
  notesTitle: {
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: COLORS.inkSoft,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 9.5,
    color: COLORS.ink,
    lineHeight: 1.4,
  },

  // ---------- Footer fijo ----------
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 14,
    paddingBottom: 18,
    paddingHorizontal: 40,
    borderTop: `0.5pt solid ${COLORS.line}`,
    backgroundColor: COLORS.surface,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  footerBrand: {
    fontSize: 10,
    fontWeight: 700,
    color: COLORS.brand,
    letterSpacing: 0.3,
  },
  footerTag: {
    fontSize: 7.5,
    fontWeight: 500,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: COLORS.inkSoft,
    marginTop: 2,
  },
  footerDetail: {
    fontSize: 8.5,
    color: COLORS.inkSoft,
    lineHeight: 1.5,
    textAlign: 'right',
  },

  // Estado del contrato (pill)
  statusPill: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
    border: `1pt solid ${COLORS.line}`,
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: COLORS.inkSoft,
  },
})

// ------------------------------------------------------------------
// Documento
// ------------------------------------------------------------------
export function FacturaDocument({
  contract,
  business = BUSINESS,
}: {
  contract: ContractForInvoice
  business?: typeof BUSINESS
}) {
  const unit = rateUnit(contract.rate_type)
  const qty = quantity(contract.start_date, contract.end_date, unit.days)
  const unitLabel =
    contract.rate_type === 'diaria'
      ? `día${qty === 1 ? '' : 's'}`
      : contract.rate_type === 'semanal'
        ? `semana${qty === 1 ? '' : 's'}`
        : `mes${qty === 1 ? 'es' : ''}`

  const subtotal = Number(contract.total_amount ?? 0)
  const deposit = Number(contract.deposit ?? 0)
  const grandTotal = subtotal + deposit

  return (
    <Document
      title={`Factura ${contract.contract_number}`}
      author={business.name}
      subject="Factura de alquiler"
    >
      <Page size="A4" style={styles.page}>
        {/* ============ HEADER ============ */}
        <View style={styles.header}>
          <View style={styles.brandBlock}>
            <Text style={styles.brandEyebrow}>Alquiler de motos y carros</Text>
            <Text style={styles.brandName}>{business.name}</Text>
            <Text style={styles.brandTagline}>{business.tagline}</Text>
          </View>
          <View style={styles.invoiceMeta}>
            <Text style={styles.invoiceLabel}>Factura N°</Text>
            <Text style={styles.invoiceNumber}>{contract.contract_number}</Text>
            <Text style={styles.invoiceDate}>
              Emitida: {new Date().toLocaleDateString('es-CO')}
            </Text>
          </View>
        </View>
        <View style={styles.headerAccent} />

        {/* ============ CONTENIDO ============ */}
        <View style={styles.content}>
          {/* Cliente y vehículo */}
          <View style={styles.metaRow}>
            <View style={styles.metaCol}>
              <Text style={styles.sectionTitle}>Cliente</Text>
              <Text style={styles.fieldValueStrong}>
                {contract.client?.full_name ?? '—'}
              </Text>
              <View style={styles.fieldStack}>
                <Text style={styles.fieldLabel}>Documento</Text>
                <Text style={styles.fieldValue}>
                  {contract.client?.document_type
                    ? `${contract.client.document_type} `
                    : ''}
                  {contract.client?.document_number ?? '—'}
                </Text>
              </View>
              {contract.client?.phone ? (
                <View style={styles.fieldStack}>
                  <Text style={styles.fieldLabel}>Teléfono</Text>
                  <Text style={styles.fieldValue}>{contract.client.phone}</Text>
                </View>
              ) : null}
              {contract.client?.email ? (
                <View style={styles.fieldStack}>
                  <Text style={styles.fieldLabel}>Correo</Text>
                  <Text style={styles.fieldValue}>{contract.client.email}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.metaCol}>
              <Text style={styles.sectionTitle}>Vehículo</Text>
              <Text style={styles.fieldValueStrong}>
                {contract.vehicle?.brand} {contract.vehicle?.model}
              </Text>
              <View style={styles.fieldStack}>
                <Text style={styles.fieldLabel}>Placa</Text>
                <Text style={styles.fieldValue}>
                  {contract.vehicle?.plate ?? '—'}
                </Text>
              </View>
              {contract.vehicle?.year ? (
                <View style={styles.fieldStack}>
                  <Text style={styles.fieldLabel}>Año</Text>
                  <Text style={styles.fieldValue}>
                    {contract.vehicle.year}
                  </Text>
                </View>
              ) : null}
              <Text style={styles.statusPill}>Estado: {contract.status}</Text>
            </View>
          </View>

          {/* Periodo */}
          <Text style={styles.sectionTitle}>Periodo de alquiler</Text>
          <View style={styles.periodBox}>
            <View style={styles.periodRow}>
              <View style={styles.periodCol}>
                <Text style={styles.fieldLabel}>Fecha de inicio</Text>
                <Text style={styles.fieldValueStrong}>
                  {formatDate(contract.start_date)}
                </Text>
              </View>
              <View style={styles.periodCol}>
                <Text style={styles.fieldLabel}>Fecha de fin</Text>
                <Text style={styles.fieldValueStrong}>
                  {formatDate(contract.end_date)}
                </Text>
              </View>
              <View style={styles.periodCol}>
                <Text style={styles.fieldLabel}>Tarifa {unit.label}</Text>
                <Text style={styles.fieldValueStrong}>
                  {COP.format(Number(contract.rate_value ?? 0))}
                </Text>
              </View>
            </View>
          </View>

          {/* Tabla de detalle */}
          <Text style={styles.sectionTitle}>Detalle</Text>
          <View style={styles.table}>
            <View style={styles.tableHead}>
              <Text style={[styles.tableHeadCell, styles.colConcept]}>
                Concepto
              </Text>
              <Text style={[styles.tableHeadCell, styles.colQty]}>Cant.</Text>
              <Text style={[styles.tableHeadCell, styles.colUnit]}>
                V. Unitario
              </Text>
              <Text style={[styles.tableHeadCell, styles.colTotal]}>Total</Text>
            </View>

            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.colConcept]}>
                Alquiler ({unit.label.toLowerCase()})
              </Text>
              <Text style={[styles.tableCell, styles.colQty]}>
                {qty} {unitLabel}
              </Text>
              <Text style={[styles.tableCell, styles.colUnit]}>
                {COP.format(Number(contract.rate_value ?? 0))}
              </Text>
              <Text
                style={[
                  styles.tableCell,
                  styles.colTotal,
                  { fontWeight: 700 },
                ]}
              >
                {COP.format(subtotal)}
              </Text>
            </View>

            {deposit > 0 ? (
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.colConcept]}>
                  Depósito (reembolsable)
                </Text>
                <Text style={[styles.tableCell, styles.colQty]}>1</Text>
                <Text style={[styles.tableCell, styles.colUnit]}>
                  {COP.format(deposit)}
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    styles.colTotal,
                    { fontWeight: 700 },
                  ]}
                >
                  {COP.format(deposit)}
                </Text>
              </View>
            ) : null}
          </View>

          {/* TOTAL */}
          <View style={styles.totalBar}>
            <Text style={styles.totalLabel}>Total a pagar</Text>
            <Text style={styles.totalValue}>{COP.format(grandTotal)}</Text>
          </View>

          {/* Notas */}
          {contract.notes ? (
            <View style={styles.notes}>
              <Text style={styles.notesTitle}>Observaciones</Text>
              <Text style={styles.notesText}>{contract.notes}</Text>
            </View>
          ) : null}
        </View>

        {/* ============ FOOTER ============ */}
        <View style={styles.footer} fixed>
          <View style={styles.footerRow}>
            <View>
              <Text style={styles.footerBrand}>{business.name}</Text>
              <Text style={styles.footerTag}>{business.tagline}</Text>
            </View>
            <View>
              <Text style={styles.footerDetail}>{business.address}</Text>
              <Text style={styles.footerDetail}>
                Tel. {business.phone} · {business.email}
              </Text>
              <Text style={styles.footerDetail}>{business.nit}</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}

// ------------------------------------------------------------------
// Utilidades: generar blob + nombre de archivo
// ------------------------------------------------------------------
export async function generateInvoiceBlob(
  contract: ContractForInvoice
): Promise<Blob> {
  return pdf(<FacturaDocument contract={contract} />).toBlob()
}

export function invoiceFileName(contract: ContractForInvoice): string {
  return `factura-${contract.contract_number}.pdf`
}

/**
 * Descarga el PDF en el navegador.
 */
export async function downloadInvoice(contract: ContractForInvoice) {
  const blob = await generateInvoiceBlob(contract)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = invoiceFileName(contract)
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/**
 * Comparte el PDF como archivo nativo (Web Share API — móvil).
 * Devuelve true si se compartió, false si el navegador no soporta compartir archivos.
 */
export async function shareInvoiceFile(
  contract: ContractForInvoice,
  text?: string
): Promise<boolean> {
  try {
    const blob = await generateInvoiceBlob(contract)
    const file = new File([blob], invoiceFileName(contract), {
      type: 'application/pdf',
    })
    const nav = navigator as Navigator & {
      canShare?: (data: { files: File[] }) => boolean
      share?: (data: ShareData & { files?: File[] }) => Promise<void>
    }
    if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
      await nav.share({
        files: [file],
        title: `Factura ${contract.contract_number}`,
        text: text ?? `Factura ${contract.contract_number}`,
      })
      return true
    }
  } catch (err) {
    console.error('shareInvoiceFile error:', err)
  }
  return false
}
