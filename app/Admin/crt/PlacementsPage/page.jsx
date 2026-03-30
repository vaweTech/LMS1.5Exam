"use client";

import { useState } from "react";

const branchesList = ["CSE", "ECE", "EEE", "MECH", "CIVIL", "MCA", "MBA"];

const studentsData = [
  {
    id: 1,
    name: "Rahul",
    branch: "CSE",
    year: "4",
    tenth: 85,
    inter: 88,
    bachelors: 8.2,
    masters: null,
    backlogs: 0,
  },
  {
    id: 2,
    name: "Priya",
    branch: "MBA",
    year: "2",
    tenth: 90,
    inter: 87,
    bachelors: 7.5,
    masters: 8.1,
    backlogs: 0,
  },
  {
    id: 3,
    name: "Kiran",
    branch: "ECE",
    year: "4",
    tenth: 70,
    inter: 75,
    bachelors: 6.5,
    masters: null,
    backlogs: 1,
  },
];

export default function PlacementsDashboard() {
  const [companies, setCompanies] = useState([]);
  const [editIndex, setEditIndex] = useState(null);

  const [form, setForm] = useState({
    name: "",
    type: "oncampus",
    tenth: "",
    inter: "",
    bachelors: "",
    masters: "",
    backlogs: 0,
    openings: "",
    branches: [],
    year: "4",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const toggleBranch = (branch) => {
    setForm((prev) => ({
      ...prev,
      branches: prev.branches.includes(branch)
        ? prev.branches.filter((b) => b !== branch)
        : [...prev.branches, branch],
    }));
  };

  const getEligibleStudents = (company) => {
    return studentsData.filter(
      (s) =>
        company.branches.includes(s.branch) &&
        s.year === company.year &&
        s.backlogs <= company.backlogs &&
        s.tenth >= company.tenth &&
        s.inter >= company.inter &&
        s.bachelors >= company.bachelors &&
        (company.masters ? s.masters >= company.masters : true)
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const newCompany = {
      ...form,
      tenth: Number(form.tenth),
      inter: Number(form.inter),
      bachelors: Number(form.bachelors),
      masters: form.masters ? Number(form.masters) : null,
      openings: Number(form.openings),
    };

    if (editIndex !== null) {
      const updated = [...companies];
      updated[editIndex] = newCompany;
      setCompanies(updated);
      setEditIndex(null);
    } else {
      setCompanies([...companies, newCompany]);
    }

    setForm({
      name: "",
      type: "oncampus",
      tenth: "",
      inter: "",
      bachelors: "",
      masters: "",
      backlogs: 0,
      openings: "",
      branches: [],
      year: "4",
    });
  };

  const handleEdit = (index) => {
    setForm(companies[index]);
    setEditIndex(index);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // 🔹 Dashboard stats
  const totalStudents = studentsData.length;
  const totalCompanies = companies.length;

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-6">
      {/* 🔹 HEADER */}
      <h1 className="text-2xl md:text-3xl font-bold mb-4">
        🎓 Placements Dashboard
      </h1>

      {/* 🔹 STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl shadow">
          <p className="text-gray-500 text-sm">Total Students</p>
          <h2 className="text-xl font-bold">{totalStudents}</h2>
        </div>
        <div className="bg-white p-4 rounded-xl shadow">
          <p className="text-gray-500 text-sm">Companies</p>
          <h2 className="text-xl font-bold">{totalCompanies}</h2>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* 🔹 FORM */}
        <div className="lg:col-span-1 bg-white p-5 rounded-xl shadow h-fit sticky top-4">
          <h2 className="text-lg font-semibold mb-3">
            {editIndex !== null ? "✏️ Edit Company" : "➕ Add Company"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              name="name"
              placeholder="Company Name"
              value={form.name}
              onChange={handleChange}
              className="w-full border p-2 rounded"
              required
            />

            {/* Type */}
            <div className="flex gap-4 text-sm">
              <label>
                <input
                  type="radio"
                  name="type"
                  value="oncampus"
                  checked={form.type === "oncampus"}
                  onChange={handleChange}
                />{" "}
                On-Campus
              </label>
              <label>
                <input
                  type="radio"
                  name="type"
                  value="offcampus"
                  checked={form.type === "offcampus"}
                  onChange={handleChange}
                />{" "}
                Off-Campus
              </label>
            </div>

            {/* Academic */}
            <div className="grid grid-cols-2 gap-2">
              <input name="tenth" placeholder="10th %" onChange={handleChange} value={form.tenth} className="border p-2 rounded" />
              <input name="inter" placeholder="Inter %" onChange={handleChange} value={form.inter} className="border p-2 rounded" />
              <input name="bachelors" placeholder="Bachelors CGPA" onChange={handleChange} value={form.bachelors} className="border p-2 rounded" />
              <input name="masters" placeholder="Masters CGPA" onChange={handleChange} value={form.masters} className="border p-2 rounded" />
            </div>

            {/* Other */}
            <div className="grid grid-cols-2 gap-2">
              <input name="backlogs" placeholder="Backlogs" onChange={handleChange} value={form.backlogs} className="border p-2 rounded" />
              <input name="openings" placeholder="Openings" onChange={handleChange} value={form.openings} className="border p-2 rounded" />
            </div>

            <select
              name="year"
              value={form.year}
              onChange={handleChange}
              className="w-full border p-2 rounded"
            >
              <option value="4">4th Year</option>
              <option value="3">3rd Year</option>
              <option value="2">2nd Year</option>
            </select>

            {/* Branch */}
            <div className="flex flex-wrap gap-2">
              {branchesList.map((b) => (
                <button
                  type="button"
                  key={b}
                  onClick={() => toggleBranch(b)}
                  className={`px-2 py-1 rounded text-sm border ${
                    form.branches.includes(b)
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100"
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>

            <button className="w-full bg-blue-600 text-white py-2 rounded">
              {editIndex !== null ? "Update" : "Create"}
            </button>
          </form>
        </div>

        {/* 🔹 COMPANY LIST */}
        <div className="lg:col-span-2 grid md:grid-cols-2 gap-4">
          {companies.map((company, index) => {
            const eligible = getEligibleStudents(company);

            return (
              <div
                key={index}
                className="bg-white p-4 rounded-xl shadow hover:shadow-lg transition"
              >
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-lg">{company.name}</h3>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      company.type === "oncampus"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {company.type}
                  </span>
                </div>

                <p className="text-sm text-gray-500">
                  Openings: {company.openings}
                </p>

                <p className="mt-2 font-medium">
                  Eligible: {eligible.length}
                </p>

                {/* Branch breakdown */}
                <div className="text-sm mt-2 space-y-1">
                  {company.branches.map((b) => {
                    const count = eligible.filter(
                      (s) => s.branch === b
                    ).length;
                    return (
                      <div key={b} className="flex justify-between">
                        <span>{b}</span>
                        <span>{count}</span>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => handleEdit(index)}
                  className="mt-3 text-blue-600 text-sm"
                >
                  ✏️ Edit
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}