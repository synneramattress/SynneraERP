"use client";

import { useCallback, useEffect, useState } from "react";
import { Save, Loader2 } from "lucide-react";
import AddressFields from "@/components/shared/AddressFields";
import {
  fetchCompanyProfile,
  saveCompanyProfile,
  validateCompanyProfile,
  type CompanyProfile,
  type CompanyProfileWrite,
} from "@/modules/company";
import { EMPTY_ADDRESS } from "@/types/address";
import { optimizeImageFile } from "@/lib/images/optimizeImage";
import { T } from "@/i18n";

function emptyProfile(): CompanyProfile {
  return {
    id: "company",
    legalName: "",
    tradeName: "",
    gstin: "",
    udyamNumber: "",
    pan: "",
    address: { ...EMPTY_ADDRESS },
    phone: "",
    email: "",
    website: "",
    logoUrl: undefined,
    authorizedSignatory: { name: "", designation: "" },
    bankDetails: {
      bankName: "",
      accountName: "",
      accountNumber: "",
      ifsc: "",
      branch: "",
      upiId: "",
    },
    invoiceSettings: {
      invoicePrefix: "SYN",
      financialYearStartMonth: 4,
      financialYearStartDay: 1,
      gstAmountType: "EXCLUSIVE",
    },
  };
}

export default function CompanyProfileSection({
  adminUid,
}: {
  adminUid?: string;
}) {
  const [profile, setProfile] = useState<CompanyProfile>(emptyProfile());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCompanyProfile();
      setProfile(
        data
          ? {
              ...emptyProfile(),
              ...data,
              address: data.address || { ...EMPTY_ADDRESS },
              authorizedSignatory: data.authorizedSignatory || { name: "" },
              bankDetails: data.bankDetails || emptyProfile().bankDetails,
              invoiceSettings:
                data.invoiceSettings || emptyProfile().invoiceSettings,
            }
          : emptyProfile()
      );
    } catch {
      setMessage({ type: "err", text: "Could not load company profile." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const patch = (partial: Partial<CompanyProfile>) =>
    setProfile((p) => ({ ...p, ...partial }));
  const fieldCls =
    "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#330066]/30";
  const labelCls = "block text-xs font-medium text-slate-500 mb-1";

  const handleSave = async () => {
    setMessage(null);
    const write: CompanyProfileWrite = {
      legalName: profile.legalName,
      tradeName: profile.tradeName,
      gstin: profile.gstin,
      udyamNumber: profile.udyamNumber || "",
      pan: profile.pan,
      address: profile.address,
      phone: profile.phone,
      email: profile.email,
      website: profile.website,
      // Logo uses public/synnera-logo.svg — do not require logoUrl
      logoUrl: profile.logoUrl,
      authorizedSignatory: profile.authorizedSignatory,
      bankDetails: profile.bankDetails,
      // Numbering / GST mode edited on Invoice Settings page only
      invoiceSettings: profile.invoiceSettings,
    };
    const v = validateCompanyProfile(write, {
      requireGst: Boolean(profile.gstin?.trim()),
    });
    if (!v.valid) {
      setMessage({
        type: "err",
        text: v.errors[0] || "Validation failed.",
      });
      return;
    }
    setSaving(true);
    try {
      await saveCompanyProfile(write, adminUid);
      setMessage({ type: "ok", text: "Company information saved." });
    } catch (e) {
      console.error(e);
      setMessage({
        type: "err",
        text:
          e instanceof Error
            ? e.message
            : "Failed to save company profile.",
      });
    } finally {
      setSaving(false);
    }
  };

  /** Signature+stamp stored optimized in company profile (not ImageKit). */
  const uploadSignatureWithStamp = async (file: File | null) => {
    if (!file || !file.type.startsWith("image/")) {
      setMessage({ type: "err", text: "Please choose an image file." });
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setMessage({ type: "err", text: "Image must be under 8 MB." });
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await optimizeImageFile(file, {
        maxEdge: 800,
        quality: 0.85,
        mime: "image/jpeg",
      });
      patch({
        authorizedSignatory: {
          ...profile.authorizedSignatory,
          signatureImageUrl: dataUrl,
          stampImageUrl: undefined,
        },
      });
      setMessage({ type: "ok", text: "Signature with stamp saved (optimized)." });
    } catch (e) {
      console.error(e);
      setMessage({
        type: "err",
        text: e instanceof Error ? e.message : "Upload failed.",
      });
    } finally {
      setUploading(false);
    }
  };

  /** UPI QR image optimized and stored on company bank details. */
  const uploadUpiQr = async (file: File | null) => {
    if (!file || !file.type.startsWith("image/")) {
      setMessage({ type: "err", text: "Please choose an image file." });
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setMessage({ type: "err", text: "Image must be under 8 MB." });
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await optimizeImageFile(file, {
        maxEdge: 500,
        quality: 0.88,
        mime: "image/jpeg",
      });
      patch({
        bankDetails: {
          ...(profile.bankDetails || {
            bankName: "",
            accountNumber: "",
            ifsc: "",
          }),
          upiQrImageUrl: dataUrl,
        },
      });
      setMessage({ type: "ok", text: "UPI QR saved (optimized)." });
    } catch (e) {
      console.error(e);
      setMessage({
        type: "err",
        text: e instanceof Error ? e.message : "Upload failed.",
      });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-slate-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        <T>Loading</T>…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {message && (
        <div
          className={
            message.type === "ok"
              ? "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
              : "rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
          }
        >
          {message.text}
        </div>
      )}

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-semibold text-slate-800">
          <T>Company identity</T>
        </p>
        <div>
          <label className={labelCls}>
            <T>Legal name</T>
          </label>
          <input
            className={fieldCls}
            value={profile.legalName || ""}
            onChange={(e) => patch({ legalName: e.target.value })}
          />
        </div>
        <div>
          <label className={labelCls}>
            <T>Trade name</T>
          </label>
          <input
            className={fieldCls}
            value={profile.tradeName || ""}
            onChange={(e) => patch({ tradeName: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>
              <T>GSTIN</T>
            </label>
            <input
              className={fieldCls}
              value={profile.gstin || ""}
              maxLength={15}
              onChange={(e) =>
                patch({ gstin: e.target.value.toUpperCase() })
              }
            />
          </div>
          <div>
            <label className={labelCls}>
              <T>PAN</T>
            </label>
            <input
              className={fieldCls}
              value={profile.pan || ""}
              maxLength={10}
              onChange={(e) =>
                patch({ pan: e.target.value.toUpperCase() })
              }
            />
          </div>
        </div>
        <div>
          <label className={labelCls}>Udyam Registration No.</label>
          <input
            className={fieldCls}
            value={profile.udyamNumber || ""}
            placeholder="UDYAM-GJ-20-0165387"
            onChange={(e) => patch({ udyamNumber: e.target.value })}
          />
          <p className="text-xs text-slate-500 mt-1">Printed on Delivery Challan (MSMED)</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>
              <T>Phone</T>
            </label>
            <input
              className={fieldCls}
              value={profile.phone || ""}
              onChange={(e) => patch({ phone: e.target.value })}
            />
          </div>
          <div>
            <label className={labelCls}>
              <T>Email</T>
            </label>
            <input
              className={fieldCls}
              type="email"
              value={profile.email || ""}
              onChange={(e) => patch({ email: e.target.value })}
            />
          </div>
        </div>
        <div>
          <label className={labelCls}>
            <T>Website</T>
          </label>
          <input
            className={fieldCls}
            value={profile.website || ""}
            onChange={(e) => patch({ website: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-semibold text-slate-800">
          <T>Registered address</T>
        </p>
        <AddressFields
          value={profile.address}
          onChange={(address) => patch({ address })}
        />
      </div>

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-semibold text-slate-800">
          <T>Company logo</T>
        </p>
        <p className="text-xs text-slate-500">
          <T>Uses the built-in logo from the app</T>{" "}
          <code className="text-[11px]">public/synnera-logo.svg</code>.{" "}
          <T>Upload is not required</T>.
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/synnera-logo.svg"
          alt="Synnera"
          className="h-14 object-contain"
        />
      </div>

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-semibold text-slate-800">
          <T>Authorized signatory</T>
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>
              <T>Name</T>
            </label>
            <input
              className={fieldCls}
              value={profile.authorizedSignatory?.name || ""}
              onChange={(e) =>
                patch({
                  authorizedSignatory: {
                    ...profile.authorizedSignatory,
                    name: e.target.value,
                  },
                })
              }
            />
          </div>
          <div>
            <label className={labelCls}>
              <T>Designation</T>
            </label>
            <input
              className={fieldCls}
              value={profile.authorizedSignatory?.designation || ""}
              onChange={(e) =>
                patch({
                  authorizedSignatory: {
                    ...profile.authorizedSignatory,
                    designation: e.target.value,
                  },
                })
              }
            />
          </div>
        </div>
        <div>
          <label className={labelCls}>
            <T>Signature with stamp</T>
          </label>
          <p className="mb-2 text-xs text-slate-500">
            <T>Upload one image that includes signature and stamp</T>
          </p>
          {profile.authorizedSignatory?.signatureImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.authorizedSignatory.signatureImageUrl}
              alt="Signature"
              className="mb-2 h-16 object-contain"
            />
          )}
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) =>
                uploadSignatureWithStamp(e.target.files?.[0] || null)
              }
            />
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <T>Uploading</T>…
              </>
            ) : profile.authorizedSignatory?.signatureImageUrl ? (
              <T>Replace signature with stamp</T>
            ) : (
              <T>Upload signature with stamp</T>
            )}
          </label>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-semibold text-slate-800">
          <T>Bank details</T>
        </p>
        <div>
          <label className={labelCls}>
            <T>Bank name</T>
          </label>
          <input
            className={fieldCls}
            value={profile.bankDetails?.bankName || ""}
            onChange={(e) =>
              patch({
                bankDetails: {
                  ...(profile.bankDetails || {
                    bankName: "",
                    accountNumber: "",
                    ifsc: "",
                  }),
                  bankName: e.target.value,
                },
              })
            }
          />
        </div>
        <div>
          <label className={labelCls}>
            <T>Account name</T>
          </label>
          <input
            className={fieldCls}
            value={profile.bankDetails?.accountName || ""}
            onChange={(e) =>
              patch({
                bankDetails: {
                  ...(profile.bankDetails || {
                    bankName: "",
                    accountNumber: "",
                    ifsc: "",
                  }),
                  accountName: e.target.value,
                },
              })
            }
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>
              <T>Account number</T>
            </label>
            <input
              className={fieldCls}
              value={profile.bankDetails?.accountNumber || ""}
              onChange={(e) =>
                patch({
                  bankDetails: {
                    ...(profile.bankDetails || {
                      bankName: "",
                      accountNumber: "",
                      ifsc: "",
                    }),
                    accountNumber: e.target.value,
                  },
                })
              }
            />
          </div>
          <div>
            <label className={labelCls}>
              <T>IFSC</T>
            </label>
            <input
              className={fieldCls}
              value={profile.bankDetails?.ifsc || ""}
              maxLength={11}
              onChange={(e) =>
                patch({
                  bankDetails: {
                    ...(profile.bankDetails || {
                      bankName: "",
                      accountNumber: "",
                      ifsc: "",
                    }),
                    ifsc: e.target.value.toUpperCase(),
                  },
                })
              }
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>
              <T>Branch</T>
            </label>
            <input
              className={fieldCls}
              value={profile.bankDetails?.branch || ""}
              onChange={(e) =>
                patch({
                  bankDetails: {
                    ...(profile.bankDetails || {
                      bankName: "",
                      accountNumber: "",
                      ifsc: "",
                    }),
                    branch: e.target.value,
                  },
                })
              }
            />
          </div>
          <div>
            <label className={labelCls}>
              <T>UPI ID</T>
            </label>
            <input
              className={fieldCls}
              value={profile.bankDetails?.upiId || ""}
              onChange={(e) =>
                patch({
                  bankDetails: {
                    ...(profile.bankDetails || {
                      bankName: "",
                      accountNumber: "",
                      ifsc: "",
                    }),
                    upiId: e.target.value,
                  },
                })
              }
            />
          </div>
        </div>
        <div>
          <label className={labelCls}>
            <T>UPI QR code</T>
          </label>
          <p className="mb-2 text-xs text-slate-500">
            <T>Upload QR for invoices — stored optimized in app</T>
          </p>
          {profile.bankDetails?.upiQrImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.bankDetails.upiQrImageUrl}
              alt="UPI QR"
              className="mb-2 h-24 w-24 object-contain rounded-lg border border-slate-100"
            />
          )}
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => uploadUpiQr(e.target.files?.[0] || null)}
            />
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <T>Uploading</T>…
              </>
            ) : profile.bankDetails?.upiQrImageUrl ? (
              <T>Replace UPI QR</T>
            ) : (
              <T>Upload UPI QR</T>
            )}
          </label>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        <T>Invoice prefix, financial year, and GST pricing mode are managed under</T>{" "}
        <a
          href="/admin/invoices/settings"
          className="font-medium text-indigo-600 hover:underline"
        >
          <T>Invoice Settings</T>
        </a>
        .
      </p>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#330066] py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        <T>Save company information</T>
      </button>
    </div>
  );
}
