"use client"

import * as React from "react"
import { Menu, Transition } from "@headlessui/react"
import { cn } from "@/lib/utils"

const DropdownMenu = Menu

const DropdownMenuTrigger = Menu.Button

const DropdownMenuContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { align?: "start" | "end" }
>(({ className, align = "center", children, ...props }, ref) => {
    let originClass = "origin-top"
    if (align === "end") originClass = "origin-top-right right-0"
    if (align === "start") originClass = "origin-top-left left-0"

    return (
        <Transition
            as={React.Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
        >
            <Menu.Items
                className={cn(
                    "absolute z-50 mt-2 min-w-[8rem] overflow-hidden rounded-md border bg-popover bg-white p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
                    originClass,
                    className
                )}
                ref={ref}
                {...props}
            >
                {children}
            </Menu.Items>
        </Transition>
    )
})
DropdownMenuContent.displayName = "DropdownMenuContent"

const DropdownMenuItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, onClick, ...props }, ref) => (
  <Menu.Item>
    {({ active }) => (
        <div
            ref={ref}
            className={cn(
            "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
            active && "bg-accent bg-gray-100 text-accent-foreground",
            className
            )}
            onClick={onClick}
            {...props}
        />
    )}
  </Menu.Item>
))
DropdownMenuItem.displayName = "DropdownMenuItem"

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  // Add others if needed
}
