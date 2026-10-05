"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormattedNumberInput } from "@/components/ui/formatted-number-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import SpinnerEllipsis from "@/components/spinner-ellipsis";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Save,
  Check,
  ChevronsUpDown,
  AlertCircleIcon,
  ImageIcon,
  UploadIcon,
  XIcon,
  Loader2,
  ArrowLeft,
  FileText,
  ExternalLink,
  Eye,
} from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  BuildingIcon,
  TankerTruckIcon,
  Route03Icon,
} from "@hugeicons/core-free-icons";
import { FilePreviewTrigger } from "@/components/file-viewer-modal";
import { cn } from "@/lib/utils";
import { apiPost } from "@/lib/client/api";
import { useFileUpload } from "@/hooks/use-file-upload";
import { useRouter } from "next/navigation";
import type { TransportFeeLeg } from "@/lib/generated/prisma/client";
import {
  getAvailableFeeLegs,
  getFeeLegBreakdown,
  getRemainingForLeg,
} from "@/lib/fleet/transport-fees";
import { PaymentConfirmDialog, type PaymentSummaryRow } from "@/components/fleet/payments/payment-dialogs";

type ExpenseCategory = "PERSONAL_EXPENSE" | "FLEET_EXPENSE" | "TRANSPORT_FEE";

function SummaryRow({
  label,
  value,
  emphasis,
  subtle,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  subtle?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm border-b border-border/60 last:border-b-0">
      <span className={cn("text-muted-foreground", subtle && "opacity-60")}>{label}</span>
      <span className={cn("font-medium text-right truncate max-w-[60%]", emphasis && "font-semibold", subtle && "opacity-60")}>
        {value}
      </span>
    </div>
  );
}

const CATEGORY_OPTIONS: Array<{
  value: ExpenseCategory;
  title: string;
  description: string;
  icon: typeof BuildingIcon;
}> = [
  {
    value: "PERSONAL_EXPENSE",
    title: "Personal / Administrative",
    description: "Office supplies, admin costs, and other non-fleet expenses.",
    icon: BuildingIcon,
  },
  {
    value: "FLEET_EXPENSE",
    title: "Fleet-Related Expense",
    description: "Fuel, maintenance, tickets, or other trip-related costs.",
    icon: TankerTruckIcon,
  },
  {
    value: "TRANSPORT_FEE",
    title: "Transport Fee Payment",
    description: "Payout to a transporter for a completed delivery leg.",
    icon: Route03Icon,
  },
];

function getDeliveryVolumeAndFee(d: any) {
  const name = d?.station?.name || d?.customer?.name || "Secondary stop";
  const liters = Number(d?.litersReceived ?? d?.litersDespatched ?? 0);
  const amount =
    Number(d?.transportCost || 0) > 0
      ? Number(d.transportCost)
      : liters * Number(d?.transportRate || 0);
  return { name, liters, amount };
}

function formatVolumeAndFee(liters: number, amount: number) {
  const parts: string[] = [];
  if (liters > 0) parts.push(`${liters.toLocaleString()} L`);
  if (amount > 0) parts.push(`₦${amount.toLocaleString()}`);
  return parts.join(" • ");
}

function getTransportLabelParts(t: any) {
  if (!t) return { ref: "", transporter: "", truck: "", destination: "", volume: "" };

  const ref =
    t.order?.reference ||
    (t.order?.supplier ? `Supplier: ${t.order.supplier}` : "") ||
    (t.orderId ? `Order #${t.orderId.slice(0, 8)}` : "") ||
    (t.deliveries?.[0]?.station?.name ? `To: ${t.deliveries[0].station.name}` : "") ||
    (t.deliveries?.[0]?.customer?.name ? `To: ${t.deliveries[0].customer.name}` : "") ||
    `Trip #${t.id?.slice(0, 8) || "N/A"}`;

  const transporter =
    (t.isOneTime ? t.oneTimeTransporterName : t.transporter?.name) ||
    t.oneTimeTransporterName ||
    t.transporter?.name ||
    "Ad-hoc Transporter";

  const truck =
    (t.isOneTime ? t.oneTimeTruckPlate : (t.truck?.plateNumber || t.truck?.name)) ||
    t.oneTimeTruckPlate ||
    t.truck?.plateNumber ||
    t.truck?.name ||
    "Unassigned Truck";

  const destination =
    t.destination ||
    t.deliveries?.[0]?.station?.name ||
    t.deliveries?.[0]?.customer?.name ||
    "Direct";

  const volume = Number(t.litersCarried || 0) > 0 ? `${Number(t.litersCarried).toLocaleString()} L` : "";

  return { ref, transporter, truck, destination, volume };
}

export default function OutgoingPaymentForm({ metadata, loading }: { metadata: any, loading: boolean }) {
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const [category, setCategory] = useState<ExpenseCategory | "">("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [transportOpen, setTransportOpen] = useState(false);
  const [transporterOpen, setTransporterOpen] = useState(false);
  const [truckOpen, setTruckOpen] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);
  const [feeLegOpen, setFeeLegOpen] = useState(false);
  const [feeLeg, setFeeLeg] = useState<TransportFeeLeg | "">("");
  const [deliveryId, setDeliveryId] = useState("");

  const feeLegSelectionKey = feeLeg
    ? feeLeg === "PRIMARY_TO_SUBSEQUENT" && deliveryId
      ? `${feeLeg}:${deliveryId}`
      : feeLeg
    : "";

  const [formData, setFormData] = useState({
    amount: "",
    description: "",
    paymentMethod: "BANK_TRANSFER",
    reference: "",
    receiptUrl: "",
    transporterId: "",
    truckId: "",
    orderId: "",
    transportId: "",
    bankAccountId: "",
  });

  const maxSizeMB = 5;
  const maxSize = maxSizeMB * 1024 * 1024;
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [
    { files, isDragging, errors: uploadErrors },
    { handleDragEnter, handleDragLeave, handleDragOver, handleDrop, openFileDialog, removeFile, getInputProps },
  ] = useFileUpload({
    accept: "image/png,image/jpeg,image/jpg,image/webp,application/pdf,.pdf",
    maxSize,
    onFilesAdded: async (addedFiles) => {
      const file = addedFiles[0]?.file;
      if (!file || !(file instanceof File)) return;
      setUploadError(null);
      setUploading(true);
      try {
        const fileType =
          file.type ||
          (file.name.toLowerCase().endsWith(".pdf")
            ? "application/pdf"
            : "image/png");
        const res = await apiPost<any>("/api/tenant/fleet/payments/upload", { contentType: fileType });
        if (res.error || !res.data) {
          setUploadError(res.error?.message ?? "Upload could not be started.");
          return;
        }

        let publicUrl = "";
        if (res.data.uploadType === "cloudinary") {
          const formDataObj = new FormData();
          formDataObj.append("file", file);
          formDataObj.append("api_key", res.data.apiKey);
          formDataObj.append("timestamp", res.data.timestamp.toString());
          formDataObj.append("signature", res.data.signature);

          const uploadRes = await fetch(res.data.url, { method: "POST", body: formDataObj });
          if (!uploadRes.ok) {
            setUploadError("Cloudinary upload failed.");
            return;
          }
          const cloudinaryData = await uploadRes.json();
          publicUrl = cloudinaryData.secure_url;
        } else {
          const put = await fetch(res.data.url, {
            method: "PUT",
            headers: { "Content-Type": fileType },
            body: file,
          });
          if (!put.ok) {
            setUploadError("S3 Upload failed.");
            return;

          }
          publicUrl = res.data.publicUrl;
        }
        setFormData((prev) => ({ ...prev, receiptUrl: publicUrl }));
      } catch (err: any) {
        setUploadError(err.message || "Failed to upload.");
      } finally {
        setUploading(false);
      }
    }
  });

  const previewUrl = formData.receiptUrl || (files[0]?.preview || null);
  const displayFileName =
    (files[0]?.file instanceof File ? files[0].file.name : null) ||
    "Payment Receipt";
  const isPdf = Boolean(
    (files[0]?.file instanceof File &&
      (files[0].file.type === "application/pdf" ||
        files[0].file.name.toLowerCase().endsWith(".pdf"))) ||
      (previewUrl && previewUrl.toLowerCase().includes(".pdf"))
  );

  const originToDepotFee = metadata?.originToDepotFee ?? 0;

  const selectedTransport = formData.transportId 
    ? metadata?.transports?.find((t: any) => t.id === formData.transportId)
    : null;

  const availableFeeLegs = selectedTransport && category === "TRANSPORT_FEE"
    ? getAvailableFeeLegs(selectedTransport, selectedTransport.transactions || [], { originToDepotFee })
    : [];

  const feeBreakdown = selectedTransport && category === "TRANSPORT_FEE"
    ? getFeeLegBreakdown(selectedTransport, selectedTransport.transactions || [], { originToDepotFee })
    : [];

  const hasPrefilledTransporter = Boolean(
    formData.transportId && (formData.transporterId || selectedTransport?.oneTimeTransporterName)
  );
  const hasPrefilledTruck = Boolean(
    formData.transportId && (formData.truckId || selectedTransport?.oneTimeTruckPlate)
  );
  const hasPrefilledOrder = Boolean(
    formData.transportId && formData.orderId
  );

  useEffect(() => {
    if ((category === "TRANSPORT_FEE" || category === "FLEET_EXPENSE") && formData.transportId && metadata?.transports) {
      const t = metadata.transports.find((x: any) => x.id === formData.transportId);
      if (t) {
        setFormData((prev) => ({ 
          ...prev, 
          transporterId: t.transporterId || prev.transporterId,
          truckId: t.truckId || prev.truckId,
          orderId: t.orderId || prev.orderId,
        }));
      }
    }
  }, [category, formData.transportId, metadata]);

  const validateBeforeConfirm = (): boolean => {
    if (!category) {
      toast.error("Please select an expense category.");
      return false;
    }
    if (category === "TRANSPORT_FEE" && !feeLeg) {
      toast.error("Select a transport fee leg.");
      return false;
    }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateBeforeConfirm()) return;
    setConfirmOpen(true);
  };

  const handleConfirmedSubmit = async () => {
    setSubmitting(true);
    try {
      let endpoint = `/api/tenant/fleet/payments/outflow/expense`;
      let payload: any = {
        amount: Number(formData.amount),
        description: formData.description,
        paymentMethod: formData.paymentMethod,
        reference: formData.reference,
        receiptUrl: formData.receiptUrl,
        bankAccountId: formData.paymentMethod !== "CASH" ? formData.bankAccountId : undefined,
      };

      if (category === "PERSONAL_EXPENSE") {
        payload.expenseType = "PERSONAL";
      } else if (category === "FLEET_EXPENSE") {
        payload.expenseType = "FLEET";
        payload.transporterId = formData.transporterId || undefined;
        payload.truckId = formData.truckId || undefined;
        payload.orderId = formData.orderId || undefined;
        payload.transportId = formData.transportId || undefined;
      } else if (category === "TRANSPORT_FEE") {
        endpoint = `/api/tenant/fleet/payments/outflow/transport`;
        payload = {
          transportId: formData.transportId,
          transporterId: formData.transporterId || selectedTransport?.transporterId || undefined,
          amount: Number(formData.amount),
          feeLeg,
          deliveryId:
            feeLeg === "PRIMARY_TO_SUBSEQUENT"
              ? deliveryId || selectedTransport?.deliveries?.[0]?.id || null
              : null,
          paymentMethod: formData.paymentMethod,
          reference: formData.reference || undefined,
          receiptUrl: formData.receiptUrl || undefined,
          description: formData.description || undefined,
          bankAccountId: formData.paymentMethod !== "CASH" ? formData.bankAccountId : undefined,
        };
      }

      const res = await apiPost<any>(endpoint, payload);

      if (!res.error) {
        setConfirmOpen(false);
        toast.success("Payment recorded", {
          description: `₦${Number(formData.amount).toLocaleString()} has been logged successfully.`,
        });
        router.push("/admin/payments");
        return;
      }
      setConfirmOpen(false);
      toast.error(res.error?.message || "Failed to record payment. Please try again.");
    } catch (e) {
      console.error(e);
      setConfirmOpen(false);
      toast.error("Something went wrong while recording this payment.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground"><SpinnerEllipsis /></div>;

  const selectedDeliveries = selectedTransport?.deliveries || [];

  const selectedBank = formData.bankAccountId
    ? metadata?.bankAccounts?.find((a: any) => a.id === formData.bankAccountId)
    : null;
  const selectedTransporter = formData.transporterId
    ? metadata?.transporters?.find((t: any) => t.id === formData.transporterId)
    : null;
  const categoryMeta = CATEGORY_OPTIONS.find((c) => c.value === category);

  const confirmRows: PaymentSummaryRow[] = [
    { label: "Category", value: categoryMeta?.title || "—", emphasis: true },
    ...(category === "TRANSPORT_FEE"
      ? [
          { label: "Transport Trip", value: selectedTransport?.order?.reference || selectedTransport?.destination || "—" },
          {
            label: "Fee Leg",
            value:
              availableFeeLegs.find((l) => (l.deliveryId ? `${l.feeLeg}:${l.deliveryId}` : l.feeLeg) === feeLegSelectionKey)?.label ||
              "—",
          },
        ]
      : []),
    ...(selectedTransporter ? [{ label: "Transporter", value: selectedTransporter.name }] : []),
    { label: "Payment Method", value: formData.paymentMethod.replace(/_/g, " ") },
    ...(selectedBank ? [{ label: "Paying From", value: `${selectedBank.bankName}${selectedBank.accountName ? " • " + selectedBank.accountName : ""}` }] : []),
    ...(formData.reference ? [{ label: "Reference", value: formData.reference }] : []),
    ...(formData.description ? [{ label: "Description", value: formData.description }] : []),
  ];

  return (
    <>
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" asChild className="h-10 w-10 shrink-0">
                <Link href="/admin/payments">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div>
                <CardTitle className="text-xl">Log Outgoing Payment</CardTitle>
                <CardDescription>Record transport fee payouts and operational expenses.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in duration-500">
              {/* SECTION: Expense Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Expense Details</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 md:col-span-2">
                  <Label>Expense Category *</Label>
                  <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
                    <PopoverTrigger asChild className="w-full">
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={categoryOpen}
                        className="w-full justify-between font-normal text-left h-auto py-2.5"
                      >
                        <div className="flex items-center gap-2.5 truncate pr-4">
                          {categoryMeta ? (
                            <>
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                                <HugeiconsIcon icon={categoryMeta.icon} size={16} strokeWidth={2} />
                              </div>
                              <div className="flex flex-col text-left">
                                <span className="text-sm font-medium">{categoryMeta.title}</span>
                                <span className="text-xs text-muted-foreground truncate">{categoryMeta.description}</span>
                              </div>
                            </>
                          ) : (
                            <span className="text-muted-foreground text-sm">Select expense category...</span>
                          )}
                        </div>
                        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="p-0"
                      style={{ width: 'var(--radix-popover-trigger-width)' }}
                      align="start"
                    >
                      <Command>
                        <CommandList>
                          <CommandGroup>
                            {CATEGORY_OPTIONS.map((opt) => {
                              const isSelected = category === opt.value;
                              return (
                                <CommandItem
                                  key={opt.value}
                                  value={`${opt.title} ${opt.description}`}
                                  onSelect={() => {
                                    setCategory(opt.value);
                                    setCategoryOpen(false);
                                  }}
                                  className="flex items-center gap-3 p-3 cursor-pointer"
                                >
                                  <div
                                    className={cn(
                                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors",
                                      isSelected
                                        ? "border-primary/40 bg-primary/15 text-primary"
                                        : "border-border/60 bg-muted/40 text-muted-foreground"
                                    )}
                                  >
                                    <HugeiconsIcon icon={opt.icon} size={18} strokeWidth={2} />
                                  </div>
                                  <div className="flex flex-col text-left flex-1 min-w-0">
                                    <span className={cn("font-medium text-sm", isSelected && "font-semibold text-primary")}>
                                      {opt.title}
                                    </span>
                                    <span className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                      {opt.description}
                                    </span>
                                  </div>
                                  <Check
                                    className={cn(
                                      "ml-auto h-4 w-4 shrink-0 transition-opacity",
                                      isSelected ? "opacity-100 text-primary" : "opacity-0"
                                    )}
                                  />
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

        {(category === "TRANSPORT_FEE" || category === "FLEET_EXPENSE") && (
          <div className="space-y-2 flex flex-col justify-end md:col-span-2">
            <Label>Select Transport Trip {category === "TRANSPORT_FEE" ? "*" : "(Optional)"}</Label>
            <Popover open={transportOpen} onOpenChange={setTransportOpen}>
              <PopoverTrigger asChild className="w-full">
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={transportOpen}
                  className="w-full justify-between font-normal text-left h-auto py-2"
                >
                  <span className="truncate pr-4">
                    {formData.transportId
                      ? (() => {
                          const t = metadata?.transports?.find((x: any) => x.id === formData.transportId);
                          if (!t) return "Select Transport Trip...";
                          const { ref, transporter, truck, destination } = getTransportLabelParts(t);
                          return `${ref} • ${transporter} • ${truck} • ${destination}`;
                        })()
                      : "Select Transport Trip..."}
                  </span>
                  <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent 
                className="p-0" 
                style={{ width: 'var(--radix-popover-trigger-width)' }} 
                align="start"
              >
                <Command>
                  <CommandInput placeholder="Search transport by ref, transporter, truck, destination..." />
                  <CommandList>
                    <CommandEmpty>No transports found.</CommandEmpty>
                    <CommandGroup>
                      {metadata?.transports?.map((t: any) => {
                        const { ref, transporter, truck, destination, volume } = getTransportLabelParts(t);
                        return (
                          <CommandItem
                            key={t.id}
                            value={`${t.id} ${ref} ${transporter} ${truck} ${destination} ${t.isOneTime ? "one-time" : ""}`.toLowerCase()}
                            onSelect={() => {
                              if (formData.transportId === t.id) {
                                setFormData({ ...formData, transportId: "", transporterId: "", truckId: "", orderId: "", amount: "" });
                              } else {
                                setFormData({
                                  ...formData,
                                  transportId: t.id,
                                  transporterId: t.transporterId || "",
                                  truckId: t.truckId || "",
                                  orderId: t.orderId || "",
                                  amount: ""
                                });
                              }
                              setFeeLeg("");
                              setDeliveryId("");
                              setTransportOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4 shrink-0", formData.transportId === t.id ? "opacity-100" : "opacity-0")} />
                            <div className="flex flex-col text-left">
                              <span className="font-semibold text-sm">
                                {ref} • {destination}
                              </span>
                              <span className="text-xs text-muted-foreground mt-0.5">
                                {transporter} • {truck} {volume ? `• ${volume}` : ""}
                              </span>
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        )}

        {category === "TRANSPORT_FEE" && (
          <div className="space-y-2 flex flex-col justify-end md:col-span-2">
            <Label>Transport Fee Leg *</Label>
            <Popover open={feeLegOpen} onOpenChange={setFeeLegOpen}>
              <PopoverTrigger asChild className="w-full">
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={feeLegOpen}
                  disabled={!formData.transportId}
                  className="w-full justify-between font-normal text-left h-auto py-2"
                >
                  <span className="truncate pr-4">
                    {feeLeg
                      ? (() => {
                          const selected = availableFeeLegs.find(
                            (l) => (l.deliveryId ? `${l.feeLeg}:${l.deliveryId}` : l.feeLeg) === feeLegSelectionKey
                          );
                          if (!selected) return "Select fee leg...";
                          if (selected.feeLeg === "FULL_TRIP") return "Full Trip";
                          const delivery = selected.deliveryId
                            ? selectedTransport?.deliveries?.find((d: any) => d.id === selected.deliveryId)
                            : null;
                          if (!delivery) return selected.label;
                          const { liters, amount } = getDeliveryVolumeAndFee(delivery);
                          const extra = formatVolumeAndFee(liters, amount);
                          return extra ? `${selected.label} • ${extra}` : selected.label;
                        })()
                      : formData.transportId
                        ? "Select fee leg..."
                        : "Select transport first"}
                  </span>
                  <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="p-0"
                style={{ width: 'var(--radix-popover-trigger-width)' }}
                align="start"
              >
                <Command>
                  <CommandInput placeholder="Search fee leg..." />
                  <CommandList>
                    <CommandEmpty>No unpaid fee legs.</CommandEmpty>
                    <CommandGroup>
                      {availableFeeLegs.map((leg) => {
                        const key = leg.deliveryId ? `${leg.feeLeg}:${leg.deliveryId}` : leg.feeLeg;
                        const delivery = leg.deliveryId
                          ? selectedTransport?.deliveries?.find((d: any) => d.id === leg.deliveryId)
                          : null;
                        const stats = delivery ? getDeliveryVolumeAndFee(delivery) : null;
                        const volumeFee = stats ? formatVolumeAndFee(stats.liters, stats.amount) : "";
                        const isFullTrip = leg.feeLeg === "FULL_TRIP";
                        return (
                          <CommandItem
                            key={key}
                            value={`${leg.label} ${key} ${isFullTrip ? "full trip" : ""} ${volumeFee}`}
                            onSelect={() => {
                              setFeeLeg(leg.feeLeg);
                              setDeliveryId(leg.deliveryId || "");
                              setFeeLegOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4 shrink-0", feeLegSelectionKey === key ? "opacity-100" : "opacity-0")} />
                            <div className="flex flex-col text-left">
                              <span className="font-semibold text-sm">
                                {isFullTrip ? "Full Trip" : leg.label}
                              </span>
                              <span className="text-xs text-muted-foreground mt-0.5">
                                {isFullTrip
                                  ? `Pays origin, depot, and all destinations together • ₦${leg.remaining.toLocaleString()} remaining`
                                  : volumeFee
                                    ? `${volumeFee} • ₦${leg.remaining.toLocaleString()} remaining`
                                    : `₦${leg.remaining.toLocaleString()} remaining`}
                              </span>
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        )}

        {(category === "FLEET_EXPENSE" || category === "TRANSPORT_FEE") && !hasPrefilledTransporter && (
          <div className="space-y-2 flex flex-col justify-end">
            <Label>Transporter {category === "TRANSPORT_FEE" ? "*" : ""}</Label>
            <Popover open={transporterOpen} onOpenChange={setTransporterOpen}>
              <PopoverTrigger asChild className="w-full">
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={transporterOpen}
                  className="w-full justify-between font-normal"
                >
                  {formData.transporterId
                    ? metadata?.transporters?.find((t: any) => t.id === formData.transporterId)?.name
                    : "Select Transporter..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent 
                className="p-0" 
                style={{ width: 'var(--radix-popover-trigger-width)' }} 
                align="start"
              >
                <Command>
                  <CommandInput placeholder="Search transporter..." />
                  <CommandList>
                    <CommandEmpty>No transporters found.</CommandEmpty>
                    <CommandGroup>
                      {metadata?.transporters?.map((t: any) => (
                        <CommandItem
                          key={t.id}
                          value={t.name}
                          onSelect={() => {
                            setFormData({ ...formData, transporterId: formData.transporterId === t.id ? "" : t.id });
                            setTransporterOpen(false);
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", formData.transporterId === t.id ? "opacity-100" : "opacity-0")} />
                          {t.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        )}

        {(category === "FLEET_EXPENSE" || category === "TRANSPORT_FEE") && (
          <>
            {!hasPrefilledTruck && (
              <div className="space-y-2 flex flex-col justify-end">
                <Label>Truck (Optional)</Label>
                <Popover open={truckOpen} onOpenChange={setTruckOpen}>
                  <PopoverTrigger asChild className="w-full">
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={truckOpen}
                      className="w-full justify-between font-normal"
                    >
                      {formData.truckId
                        ? (() => {
                            const t = metadata?.trucks?.find((t: any) => t.id === formData.truckId);
                            return t ? `${t.name} - ${t.truckNumber || t.plateNumber}` : "Select Truck...";
                          })()
                        : "Select Truck..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search truck..." />
                      <CommandList>
                        <CommandEmpty>No trucks found.</CommandEmpty>
                        <CommandGroup>
                          {metadata?.trucks?.map((t: any) => (
                            <CommandItem
                              key={t.id}
                              value={`${t.name} ${t.truckNumber}`}
                              onSelect={() => {
                                setFormData({ ...formData, truckId: formData.truckId === t.id ? "" : t.id });
                                setTruckOpen(false);
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", formData.truckId === t.id ? "opacity-100" : "opacity-0")} />
                              {t.name} - {t.truckNumber}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            )}
            {!hasPrefilledOrder && (
              <div className="space-y-2 flex flex-col justify-end">
                <Label>Order (Optional)</Label>
                <Popover open={orderOpen} onOpenChange={setOrderOpen}>
                  <PopoverTrigger asChild className="w-full">
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={orderOpen}
                      className="w-full justify-between font-normal"
                    >
                      {formData.orderId
                        ? (() => {
                            const o = metadata?.orders?.find((o: any) => o.id === formData.orderId);
                            return o ? (o.reference || o.id.substring(0,8)) : "Select Order...";
                          })()
                        : "Select Order..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search order..." />
                      <CommandList>
                        <CommandEmpty>No orders found.</CommandEmpty>
                        <CommandGroup>
                          {metadata?.orders?.map((o: any) => (
                            <CommandItem
                              key={o.id}
                              value={o.reference || o.id}
                              onSelect={() => {
                                setFormData({ ...formData, orderId: formData.orderId === o.id ? "" : o.id });
                                setOrderOpen(false);
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", formData.orderId === o.id ? "opacity-100" : "opacity-0")} />
                              {o.reference || o.id.substring(0,8)}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </>
        )}
      </div>
    </div>

    {/* SECTION: Financial Details */}
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Financial Details</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Amount Paid (₦) *</Label>
          <FormattedNumberInput 
            required
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            placeholder="e.g. 50000"
            prefixText="₦"
          />
        </div>

        <div className="space-y-2">
          <Label>Payment Method *</Label>
          <Select 
            value={formData.paymentMethod} 
            onValueChange={(val) => setFormData({ ...formData, paymentMethod: val })}
            required
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Payment Method" />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
              <SelectItem value="CASH">Cash</SelectItem>
              <SelectItem value="POS">POS</SelectItem>
              <SelectItem value="CHEQUE">Cheque</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {formData.paymentMethod !== "CASH" && (
          <div className="space-y-2">
            <Label>Paying Bank Account *</Label>
            <Popover open={bankOpen} onOpenChange={setBankOpen}>
              <PopoverTrigger asChild className="w-full">
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={bankOpen}
                  className="h-9 w-full justify-between font-normal"
                >
                  <span className="min-w-0 flex-1 truncate text-left">
                    {formData.bankAccountId
                      ? (() => {
                          const account = metadata?.bankAccounts?.find((a: any) => a.id === formData.bankAccountId);
                          return account
                            ? `${account.accountName ? account.accountName + " - " : ""}${account.bankName}`
                            : "Select Bank Account...";
                        })()
                      : "Select Bank Account..."}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent 
                className="p-0" 
                style={{ width: 'var(--radix-popover-trigger-width)' }} 
                align="start"
              >
                <Command>
                  <CommandInput placeholder="Search bank account..." />
                  <CommandList>
                    <CommandEmpty>No bank accounts found.</CommandEmpty>
                    <CommandGroup>
                      {metadata?.bankAccounts?.map((account: any) => (
                        <CommandItem
                          key={account.id}
                          value={`${account.bankName} ${account.accountName || ""} ${account.accountNumber}`}
                          onSelect={() => {
                            setFormData({ ...formData, bankAccountId: account.id });
                            setBankOpen(false);
                          }}
                          data-checked={formData.bankAccountId === account.id}
                        >
                          <div className="flex flex-col text-left">
                            <span className="font-semibold text-sm">{account.bankName}</span>
                            <span className="text-xs text-muted-foreground mt-0.5">
                              {account.accountName ? account.accountName + " • " : ""}{account.accountNumber}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        )}

        <div className="space-y-2">
          <Label>Transaction Reference</Label>
          <Input 
            type="text"
            value={formData.reference}
            onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
            placeholder="e.g. TXN-12345 (Optional)"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>Description / Purpose {category !== "TRANSPORT_FEE" ? "*" : ""}</Label>
          <Input 
            list="expense-descriptions"
            required={category !== "TRANSPORT_FEE"}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Select or type a purpose..."
          />
          <datalist id="expense-descriptions">
            <option value="Fuel Purchase" />
            <option value="Vehicle Maintenance & Repair" />
            <option value="Driver Allowance" />
            <option value="Toll Gate Fee" />
            <option value="Local Government Ticket" />
            <option value="Tyre Repair / Replacement" />
            <option value="Police / Security Checkpoint" />
            <option value="Union Dues / NUPENG" />
            <option value="Office Supplies" />
            <option value="Transport Fee Payout" />
          </datalist>
        </div>
      </div>
    </div>

    {/* SECTION: Proof of Payment */}
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Proof of Payment</h3>
      </div>
      <div className="space-y-2">
        <Label>Attach Proof</Label>
          <div className="relative">
            <div
              className="relative flex min-h-48 flex-col items-center justify-center overflow-hidden rounded-xl border border-input border-dashed p-4 transition-colors has-[input:focus]:border-ring has-[input:focus]:ring-[3px] has-[input:focus]:ring-ring/50 data-[dragging=true]:bg-accent/50"
              data-dragging={isDragging || undefined}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <input {...getInputProps()} aria-label="Upload receipt file" className="sr-only" disabled={uploading} />
              
              {uploading ? (
                <div className="flex flex-col items-center justify-center p-4">
                   <Loader2 className="size-8 animate-spin text-muted-foreground mb-4" />
                   <p className="text-sm font-medium">Uploading receipt...</p>
                </div>
              ) : previewUrl ? (
                <FilePreviewTrigger
                  fileUrl={previewUrl}
                  fileName={displayFileName}
                  className="absolute inset-0 flex items-center justify-center p-4 bg-background cursor-pointer group"
                >
                  {isPdf ? (
                    <div className="flex flex-col items-center justify-center text-center p-2">
                      <div className="mb-2 flex size-14 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-105">
                        <FileText className="size-8" />
                      </div>
                      <p className="text-sm font-medium text-foreground max-w-[240px] truncate mb-1">
                        {displayFileName}
                      </p>
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground font-medium mb-2">
                        PDF Document
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-primary group-hover:underline">
                        <Eye className="size-3" /> Preview Document
                      </span>
                    </div>
                  ) : (
                    <div className="relative flex size-full items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        alt={displayFileName}
                        className="mx-auto max-h-full rounded object-contain transition-transform duration-200 group-hover:scale-102"
                        src={previewUrl}
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100 rounded-lg">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1.5 text-xs font-semibold shadow-md backdrop-blur-sm">
                          <Eye className="size-3.5" /> Preview Receipt
                        </span>
                      </div>
                    </div>
                  )}
                </FilePreviewTrigger>
              ) : (
                <div className="flex flex-col items-center justify-center px-4 py-3 text-center">
                  <div aria-hidden="true" className="mb-2 flex size-11 shrink-0 items-center justify-center rounded-full border bg-background">
                    <UploadIcon className="size-4 opacity-60" />
                  </div>
                  <p className="mb-1.5 font-medium text-sm">Drop your receipt here</p>
                  <p className="text-muted-foreground text-xs">PDF, PNG, JPG or WEBP (max. {maxSizeMB}MB)</p>
                  <Button className="mt-4" onClick={openFileDialog} variant="outline" type="button">
                    <UploadIcon aria-hidden="true" className="-ms-1 size-4 opacity-60" /> Select file
                  </Button>
                </div>
              )}
            </div>

            {previewUrl && !uploading && (
              <div className="absolute top-4 right-4 z-50">
                <button
                  aria-label="Remove receipt"
                  className="flex size-8 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white outline-none transition-[color,box-shadow] hover:bg-black/80 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  onClick={() => {
                     removeFile(files[0]?.id);
                     setFormData((prev) => ({ ...prev, receiptUrl: "" }));
                  }}
                  type="button"
                >
                  <XIcon aria-hidden="true" className="size-4" />
                </button>
              </div>
            )}
          </div>

          {(uploadErrors.length > 0 || uploadError) && (
            <div className="flex items-center gap-1 text-destructive text-xs mt-2" role="alert">
              <AlertCircleIcon className="size-3 shrink-0" />
              <span>{uploadErrors[0] || uploadError}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-border/30">
            <Button 
              type="submit" 
              disabled={submitting}
              className="h-10 rounded-full px-6 gap-2"
            >
              {submitting ? (
                <>
                  <SpinnerEllipsis />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Log Expense</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  </div>

  <div className="lg:col-span-1">
    <div className="sticky top-6 rounded-lg border border-border/60 bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
        <h3 className="font-medium text-sm">Payment Summary</h3>
        {Number(formData.amount) > 0 && (
          <span className="text-sm font-semibold tabular-nums">₦{Number(formData.amount).toLocaleString()}</span>
        )}
      </div>

      <div>
      {selectedTransport && category === "TRANSPORT_FEE" ? (
        <>
          <SummaryRow
            label="Trip / Order"
            value={
              selectedTransport.order?.reference ||
              (selectedTransport.orderId ? `Order #${selectedTransport.orderId.slice(0, 8)}` : `Trip #${selectedTransport.id.slice(0, 8)}`)
            }
          />
          <SummaryRow
            label="Transporter"
            value={
              (selectedTransport.isOneTime ? selectedTransport.oneTimeTransporterName : selectedTransport.transporter?.name) ||
              selectedTransport.oneTimeTransporterName ||
              selectedTransport.transporter?.name ||
              "Ad-hoc Transporter"
            }
          />
          <SummaryRow
            label="Truck"
            value={
              (selectedTransport.isOneTime ? selectedTransport.oneTimeTruckPlate : (selectedTransport.truck?.plateNumber || selectedTransport.truck?.name)) ||
              selectedTransport.oneTimeTruckPlate ||
              selectedTransport.truck?.plateNumber ||
              selectedTransport.truck?.name ||
              "Unassigned Truck"
            }
          />
          <SummaryRow label="Destination" value={selectedTransport.destination || "Direct"} />
          <div className="px-4 py-2 bg-muted/30 border-y border-border/60">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Fee Breakdown</span>
          </div>
          {feeBreakdown.map((row) => (
            <SummaryRow
              key={`${row.feeLeg}-${row.deliveryId || "default"}`}
              label={row.label}
              value={`₦${row.paid.toLocaleString()} / ₦${row.expected.toLocaleString()}`}
              subtle={row.status === "not_applicable"}
            />
          ))}
          {feeLeg && (
            <SummaryRow
              label="Remaining for leg"
              value={`₦${getRemainingForLeg(
                selectedTransport,
                selectedTransport.transactions || [],
                feeLeg,
                {
                  deliveryId: feeLeg === "PRIMARY_TO_SUBSEQUENT" ? (deliveryId || selectedDeliveries[0]?.id) : undefined,
                  originToDepotFee,
                }
              ).toLocaleString()}`}
              emphasis
            />
          )}
        </>
      ) : selectedTransport ? (
        <>
          <SummaryRow
            label="Trip / Order"
            value={
              selectedTransport.order?.reference ||
              (selectedTransport.orderId ? `Order #${selectedTransport.orderId.slice(0, 8)}` : `Trip #${selectedTransport.id.slice(0, 8)}`)
            }
          />
          <SummaryRow
            label="Transporter"
            value={
              (selectedTransport.isOneTime ? selectedTransport.oneTimeTransporterName : selectedTransport.transporter?.name) ||
              selectedTransport.oneTimeTransporterName ||
              selectedTransport.transporter?.name ||
              "Ad-hoc Transporter"
            }
          />
          <SummaryRow
            label="Truck"
            value={
              (selectedTransport.isOneTime ? selectedTransport.oneTimeTruckPlate : (selectedTransport.truck?.plateNumber || selectedTransport.truck?.name)) ||
              selectedTransport.oneTimeTruckPlate ||
              selectedTransport.truck?.plateNumber ||
              selectedTransport.truck?.name ||
              "Unassigned Truck"
            }
          />
          <SummaryRow label="Destination" value={selectedTransport.destination || "Direct"} />
        </>
      ) : category ? (
        <div className="px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground font-medium">{categoryMeta?.title}</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Fill in the financial details to complete this payment.</p>
        </div>
      ) : (
        <div className="px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground font-medium">No Category Selected</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Choose an expense category to see relevant payment details here.</p>
        </div>
      )}

      {(formData.paymentMethod || selectedBank) && (
        <>
          <SummaryRow label="Method" value={formData.paymentMethod.replace(/_/g, " ")} />
          {selectedBank && <SummaryRow label="From Account" value={selectedBank.bankName} />}
        </>
      )}
      </div>
    </div>
  </div>
</div>

<PaymentConfirmDialog
  open={confirmOpen}
  onOpenChange={setConfirmOpen}
  onConfirm={handleConfirmedSubmit}
  confirming={submitting}
  tone="destructive"
  title="Confirm outgoing payment"
  description="Please review the payment details below before it is logged."
  amountLabel={`₦${(Number(formData.amount) || 0).toLocaleString()}`}
  rows={confirmRows}
  confirmLabel="Confirm & Log Expense"
/>
</>
);
}
