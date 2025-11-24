"use client";
import { Listbox, Transition } from "@headlessui/react";
import { Fragment, useState } from "react";

const timeRanges = [
  { id: 1, name: "Last 7 days" },
  { id: 2, name: "Last 30 days" },
  { id: 3, name: "Last 90 days" },
];

export default function CustomSelect() {
  const [selected, setSelected] = useState(timeRanges[0]);

  return (
    <Listbox value={selected} onChange={setSelected}>
      <div className="relative w-48">
        <Listbox.Button className="relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-300 sm:text-sm">
          <span className="block truncate">{selected.name}</span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <span className="material-symbols-outlined text-gray-400" aria-hidden="true">
              unfold_more
            </span>
          </span>
        </Listbox.Button>
        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
            {timeRanges.map((range) => (
              <Listbox.Option
                key={range.id}
                className={({ active }) =>
                  `relative cursor-default select-none py-2 pl-10 pr-4 ${
                    active ? "bg-emerald-100 text-emerald-900" : "text-gray-900"
                  }`
                }
                value={range}
              >
                {({ selected }) => (
                  <>
                    <span
                      className={`block truncate ${
                        selected ? "font-medium" : "font-normal"
                      }`}
                    >
                      {range.name}
                    </span>
                    {selected ? (
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-emerald-600">
                        <span className="material-symbols-outlined" aria-hidden="true">check</span>
                      </span>
                    ) : null}
                  </>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  );
}