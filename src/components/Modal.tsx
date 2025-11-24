"use client";

import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { motion } from "framer-motion";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  icon?: "warning" | "danger" | "success" | "info";
}

export function Modal({ isOpen, onClose, title, description, children, icon = "info" }: ModalProps) {
  const iconConfig = {
    warning: { color: "text-amber-600", bg: "bg-amber-100", icon: "warning" },
    danger: { color: "text-red-600", bg: "bg-red-100", icon: "error" },
    success: { color: "text-emerald-600", bg: "bg-emerald-100", icon: "check_circle" },
    info: { color: "text-blue-600", bg: "bg-blue-100", icon: "info" },
  };

  const config = iconConfig[icon];

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />
        </Transition.Child>

        {/* Modal */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
                <div className="p-6">
                  {/* Icon */}
                  <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${config.bg} mb-4`}>
                    <span className={`material-symbols-outlined text-3xl ${config.color}`}>
                      {config.icon}
                    </span>
                  </div>

                  {/* Title */}
                  <Dialog.Title as="h3" className="text-xl font-bold text-gray-900 text-center mb-2">
                    {title}
                  </Dialog.Title>

                  {/* Description */}
                  {description && (
                    <Dialog.Description className="text-sm text-gray-600 text-center mb-6">
                      {description}
                    </Dialog.Description>
                  )}

                  {/* Content */}
                  {children}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  danger?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isLoading = false,
  danger = false,
}: ConfirmModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      icon={danger ? "danger" : "warning"}
    >
      <div className="flex gap-3 mt-6">
        <button
          onClick={onClose}
          disabled={isLoading}
          className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          {cancelText}
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className={`flex-1 px-4 py-3 rounded-lg font-medium text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
            danger
              ? "bg-red-600 hover:bg-red-700"
              : "bg-emerald-600 hover:bg-emerald-700"
          }`}
        >
          {isLoading && (
            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          )}
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}

interface PromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (value: string) => void;
  title: string;
  description?: string;
  placeholder?: string;
  submitText?: string;
  cancelText?: string;
  isLoading?: boolean;
  required?: boolean;
}

export function PromptModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  description,
  placeholder = "Enter your response...",
  submitText = "Submit",
  cancelText = "Cancel",
  isLoading = false,
  required = false,
}: PromptModalProps) {
  const [value, setValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (required && !value.trim()) return;
    onSubmit(value);
    setValue("");
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      icon="info"
    >
      <form onSubmit={handleSubmit} className="mt-4">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          rows={4}
          autoFocus
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none text-gray-900 text-base placeholder:text-gray-400 font-normal leading-relaxed"
        />
        <div className="flex gap-3 mt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="submit"
            disabled={isLoading || (required && !value.trim())}
            className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading && (
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            )}
            {submitText}
          </button>
        </div>
      </form>
    </Modal>
  );
}

import { useState } from "react";
