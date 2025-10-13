// src/components/ui/confirm-dialog.tsx

import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Define the types for the component's props
interface ConfirmDialogProps {
  children: React.ReactNode; // The element that will trigger the dialog (e.g., a button)
  title: string;
  description: string;
  onConfirm: () => void; // The function to execute when the "Confirm" button is clicked
  cancelText?: string;    // Optional text for the cancel button
  confirmText?: string;   // Optional text for the confirm button
  isDestructive?: boolean; // Optional prop to apply a red, destructive style
}

export function ConfirmDialog({
  children,
  title,
  description,
  onConfirm,
  cancelText = "Cancel",       // Default value
  confirmText = "Confirm",     // Default value
  isDestructive = false,   // Default value
}: ConfirmDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelText}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            // Conditionally add classes for destructive styling
            className={isDestructive ? "bg-red-600 hover:bg-red-700" : ""}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}