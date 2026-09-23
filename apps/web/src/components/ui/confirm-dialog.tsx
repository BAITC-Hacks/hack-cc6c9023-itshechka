"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "./button";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
};

export function ConfirmDialog({ open, title, description, confirmLabel = "Подтвердить", onConfirm, onClose }: ConfirmDialogProps) {
  if (!open) return null;
  return <div className="dialog-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <div className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description">
      <span className="confirm-dialog__icon"><AlertTriangle size={22} /></span>
      <h2 id="confirm-title">{title}</h2><p id="confirm-description">{description}</p>
      <div><Button variant="ghost" onClick={onClose}>Отмена</Button><Button onClick={onConfirm}>{confirmLabel}</Button></div>
    </div>
  </div>;
}
