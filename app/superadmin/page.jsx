"use client";

import { useState } from "react";
import CheckAdminAuth from "@/lib/CheckAdminAuth";

function SuperAdminPage() {
    const [modalOpen, setModalOpen] = useState(false);

    return (
        <div>
            <CheckAdminAuth>
            <h1 className="text-2xl font-bold text-center">Super Admin Page</h1>
            <p className="text-gray-600">This is the super admin page</p>
            <div className="flex flex-col gap-2">
                <button
                    type="button"
                    onClick={() => setModalOpen(true)}
                    className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                >
                    Create College Admin
                </button>
                {modalOpen && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                        onClick={() => setModalOpen(false)}
                        role="presentation"
                    >
                        <div
                            className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg"
                            onClick={(e) => e.stopPropagation()}
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="create-college-admin-title"
                        >
                            <div className="mb-4 flex items-center justify-between">
                                <h2 id="create-college-admin-title" className="text-lg font-semibold">
                                    Create College Admin
                                </h2>
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="text-gray-600 hover:text-gray-800"
                                    aria-label="Close"
                                >
                                    ✕
                                </button>
                            </div>
                            <div className="flex flex-col gap-3">
                                <input
                                    type="text"
                                    placeholder="College Name"
                                    className="rounded border px-3 py-2"
                                />
                                <input
                                    type="email"
                                    placeholder="College Email"
                                    className="rounded border px-3 py-2"
                                />
                                <input
                                    type="password"
                                    placeholder="College Password"
                                    className="rounded border px-3 py-2"
                                />
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                                >
                                    Create
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            </CheckAdminAuth>
        </div>
    );
}
export default SuperAdminPage;
