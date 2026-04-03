// "use client";
// // // "use client";

// // // import { useState } from "react";

// // // const branchesList = ["CSE", "ECE", "EEE", "MECH", "CIVIL", "MCA", "MBA"];

// // // const studentsData = [
// // //   {
// // //     id: 1,
// // //     name: "Rahul",
// // //     branch: "CSE",
// // //     year: "4",
// // //     tenth: 85,
// // //     inter: 88,
// // //     bachelors: 8.2,
// // //     masters: null,
// // //     backlogs: 0,
// // //   },
// // //   {
// // //     id: 2,
// // //     name: "Priya",
// // //     branch: "MBA",
// // //     year: "2",
// // //     tenth: 90,
// // //     inter: 87,
// // //     bachelors: 7.5,
// // //     masters: 8.1,
// // //     backlogs: 0,
// // //   },
// // //   {
// // //     id: 3,
// // //     name: "Kiran",
// // //     branch: "ECE",
// // //     year: "4",
// // //     tenth: 70,
// // //     inter: 75,
// // //     bachelors: 6.5,
// // //     masters: null,
// // //     backlogs: 1,
// // //   },
// // // ];

// // // export default function PlacementsDashboard() {
// // //   const [companies, setCompanies] = useState([]);
// // //   const [editIndex, setEditIndex] = useState(null);

// // //   const [form, setForm] = useState({
// // //     name: "",
// // //     type: "oncampus",
// // //     tenth: "",
// // //     inter: "",
// // //     bachelors: "",
// // //     masters: "",
// // //     backlogs: "",
// // //     openings: "",
// // //     branches: [],
// // //     year: "4",
// // //   });

// // //   const handleChange = (e) => {
// // //     setForm({ ...form, [e.target.name]: e.target.value });
// // //   };

// // //   const toggleBranch = (branch) => {
// // //     setForm((prev) => ({
// // //       ...prev,
// // //       branches: prev.branches.includes(branch)
// // //         ? prev.branches.filter((b) => b !== branch)
// // //         : [...prev.branches, branch],
// // //     }));
// // //   };

// // //   const getEligibleStudents = (company) => {
// // //     return studentsData.filter(
// // //       (s) =>
// // //         company.branches.includes(s.branch) &&
// // //         s.year === company.year &&
// // //         s.backlogs <= company.backlogs &&
// // //         s.tenth >= company.tenth &&
// // //         s.inter >= company.inter &&
// // //         s.bachelors >= company.bachelors &&
// // //         (company.masters ? s.masters >= company.masters : true)
// // //     );
// // //   };

// // //   const handleSubmit = (e) => {
// // //     e.preventDefault();

// // //     const newCompany = {
// // //       ...form,
// // //       tenth: Number(form.tenth),
// // //       inter: Number(form.inter),
// // //       bachelors: Number(form.bachelors),
// // //       masters: form.masters ? Number(form.masters) : null,
// // //       openings: Number(form.openings),
// // //     };

// // //     if (editIndex !== null) {
// // //       const updated = [...companies];
// // //       updated[editIndex] = newCompany;
// // //       setCompanies(updated);
// // //       setEditIndex(null);
// // //     } else {
// // //       setCompanies([...companies, newCompany]);
// // //     }

// // //     setForm({
// // //       name: "",
// // //       type: "oncampus",
// // //       tenth: "",
// // //       inter: "",
// // //       bachelors: "",
// // //       masters: "",
// // //       backlogs: "0",
// // //       openings: "",
// // //       branches: [],
// // //       year: "4",
// // //     });
// // //   };

// // //   const handleEdit = (index) => {
// // //     setForm(companies[index]);
// // //     setEditIndex(index);
// // //     window.scrollTo({ top: 0, behavior: "smooth" });
// // //   };

// // //   // 🔹 Dashboard stats
// // //   const totalStudents = studentsData.length;
// // //   const totalCompanies = companies.length;

// // //   return (
// // //     <div className="min-h-screen bg-gray-100 p-4 md:p-6">
// // //       {/* 🔹 HEADER */}
// // //       <h1 className="text-2xl md:text-3xl font-bold mb-4">
// // //         🎓 Placements Dashboard
// // //       </h1>

// // //       {/* 🔹 STATS */}
// // //       <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
// // //         <div className="bg-white p-4 rounded-xl shadow">
// // //           <p className="text-gray-500 text-sm">Total Students</p>
// // //           <h2 className="text-xl font-bold">{totalStudents}</h2>
// // //         </div>
// // //         <div className="bg-white p-4 rounded-xl shadow">
// // //           <p className="text-gray-500 text-sm">Companies</p>
// // //           <h2 className="text-xl font-bold">{totalCompanies}</h2>
// // //         </div>
// // //       </div>

// // //       <div className="grid lg:grid-cols-3 gap-6">
// // //         {/* 🔹 FORM */}
// // //         <div className="lg:col-span-1 bg-white p-5 rounded-xl shadow h-fit sticky top-4">
// // //           <h2 className="text-lg font-semibold mb-3">
// // //             {editIndex !== null ? "✏️ Edit Company" : "➕ Add Company"}
// // //           </h2>

// // //           <form onSubmit={handleSubmit} className="space-y-3">
// // //             <input
// // //               name="name"
// // //               placeholder="Company Name"
// // //               value={form.name}
// // //               onChange={handleChange}
// // //               className="w-full border p-2 rounded"
// // //               required
// // //             />

// // //             {/* Type */}
// // //             <div className="flex gap-4 text-sm">
// // //               <label>
// // //                 <input
// // //                   type="radio"
// // //                   name="type"
// // //                   value="oncampus"
// // //                   checked={form.type === "oncampus"}
// // //                   onChange={handleChange}
// // //                 />{" "}
// // //                 On-Campus
// // //               </label>
// // //               <label>
// // //                 <input
// // //                   type="radio"
// // //                   name="type"
// // //                   value="offcampus"
// // //                   checked={form.type === "offcampus"}
// // //                   onChange={handleChange}
// // //                 />{" "}
// // //                 Off-Campus
// // //               </label>
// // //             </div>

// // //             {/* Academic */}
// // //             <div className="grid grid-cols-2 gap-2">
// // //               <input name="tenth" placeholder="10th %" onChange={handleChange} value={form.tenth} className="border p-2 rounded" />
// // //               <input name="inter" placeholder="Inter %" onChange={handleChange} value={form.inter} className="border p-2 rounded" />
// // //               <input name="bachelors" placeholder="Bachelors CGPA" onChange={handleChange} value={form.bachelors} className="border p-2 rounded" />
// // //               <input name="masters" placeholder="Masters CGPA" onChange={handleChange} value={form.masters} className="border p-2 rounded" />
// // //             </div>

// // //             {/* Other */}
// // //             <div className="grid grid-cols-2 gap-2">
// // //               <input name="backlogs" placeholder="Backlogs" type="number" onChange={handleChange} value={form.backlogs} className="border p-2 rounded" />
// // //               <input name="openings" placeholder="Openings" type="number" onChange={handleChange} value={form.openings} className="border p-2 rounded" />
// // //             </div>

// // //             <select
// // //               name="year"
// // //               value={form.year}
// // //               onChange={handleChange}
// // //               className="w-full border p-2 rounded"
// // //             >
// // //               <option value="4">4th Year</option>
// // //               <option value="3">3rd Year</option>
// // //               <option value="2">2nd Year</option>
// // //             </select>

// // //             {/* Branch */}
// // //             <div className="flex flex-wrap gap-2">
// // //               {branchesList.map((b) => (
// // //                 <button
// // //                   type="button"
// // //                   key={b}
// // //                   onClick={() => toggleBranch(b)}
// // //                   className={`px-2 py-1 rounded text-sm border ${
// // //                     form.branches.includes(b)
// // //                       ? "bg-blue-600 text-white"
// // //                       : "bg-gray-100"
// // //                   }`}
// // //                 >
// // //                   {b}
// // //                 </button>
// // //               ))}
// // //             </div>

// // //             <button className="w-full bg-blue-600 text-white py-2 rounded">
// // //               {editIndex !== null ? "Update" : "Create"}
// // //             </button>
// // //           </form>
// // //         </div>

// // //         {/* 🔹 COMPANY LIST */}
// // //         <div className="lg:col-span-2 grid md:grid-cols-2 gap-4">
// // //           {companies.map((company, index) => {
// // //             const eligible = getEligibleStudents(company);

// // //             return (
// // //               <div
// // //                 key={index}
// // //                 className="bg-white p-4 rounded-xl shadow hover:shadow-lg transition"
// // //               >
// // //                 <div className="flex justify-between items-center">
// // //                   <h3 className="font-semibold text-lg">{company.name}</h3>
// // //                   <span
// // //                     className={`text-xs px-2 py-1 rounded ${
// // //                       company.type === "oncampus"
// // //                         ? "bg-green-100 text-green-700"
// // //                         : "bg-yellow-100 text-yellow-700"
// // //                     }`}
// // //                   >
// // //                     {company.type}
// // //                   </span>
// // //                 </div>

// // //                 <p className="text-sm text-gray-500">
// // //                   Openings: {company.openings}
// // //                 </p>

// // //                 <p className="mt-2 font-medium">
// // //                   Eligible: {eligible.length}
// // //                 </p>

// // //                 {/* Branch breakdown */}
// // //                 <div className="text-sm mt-2 space-y-1">
// // //                   {company.branches.map((b) => {
// // //                     const count = eligible.filter(
// // //                       (s) => s.branch === b
// // //                     ).length;
// // //                     return (
// // //                       <div key={b} className="flex justify-between">
// // //                         <span>{b}</span>
// // //                         <span>{count}</span>
// // //                       </div>
// // //                     );
// // //                   })}
// // //                 </div>

// // //                 <button
// // //                   onClick={() => handleEdit(index)}
// // //                   className="mt-3 text-blue-600 text-sm"
// // //                 >
// // //                   ✏️ Edit
// // //                 </button>
// // //               </div>
// // //             );
// // //           })}
// // //         </div>
// // //       </div>
// // //     </div>
// // //   );
// // // }




// // "use client";

// // import { useState, useMemo } from "react";
// // import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

// // const branchesList = ["CSE", "ECE", "EEE", "MECH", "CIVIL", "MCA", "MBA"];
// // const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316"];

// // const studentsData = [
// //   { id: 1, name: "Rahul", branch: "CSE", year: "4", tenth: 85, inter: 88, bachelors: 8.2, masters: null, backlogs: 0 },
// //   { id: 2, name: "Priya", branch: "MBA", year: "2", tenth: 90, inter: 87, bachelors: 7.5, masters: 8.1, backlogs: 0 },
// //   { id: 3, name: "Kiran", branch: "ECE", year: "4", tenth: 70, inter: 75, bachelors: 6.5, masters: null, backlogs: 1 },
// // ];

// // export default function PlacementsDashboard() {
// //   const [companies, setCompanies] = useState([]);
// //   const [editIndex, setEditIndex] = useState(null);

// //   const [form, setForm] = useState({
// //     name: "",
// //     type: "oncampus",
// //     tenth: "",
// //     inter: "",
// //     bachelors: "",
// //     masters: "",
// //     backlogs: "",
// //     openings: "",
// //     branches: [],
// //     year: "4",
// //   });

// //   const handleChange = (e) => {
// //     setForm({ ...form, [e.target.name]: e.target.value });
// //   };

// //   const toggleBranch = (branch) => {
// //     setForm((prev) => ({
// //       ...prev,
// //       branches: prev.branches.includes(branch)
// //         ? prev.branches.filter((b) => b !== branch)
// //         : [...prev.branches, branch],
// //     }));
// //   };

// //   const getEligibleStudents = (company) => {
// //     return studentsData.filter(
// //       (s) =>
// //         company.branches.includes(s.branch) &&
// //         s.year === company.year &&
// //         s.backlogs <= company.backlogs &&
// //         s.tenth >= company.tenth &&
// //         s.inter >= company.inter &&
// //         s.bachelors >= company.bachelors &&
// //         (company.masters ? s.masters >= company.masters : true)
// //     );
// //   };
// //   const departmentData = branchesList.map((branch) => {
// //     const count = studentsData.filter(
// //       (s) => s.branch === branch && s.backlogs === 0
// //     ).length;
  
// //     return {
// //       name: branch,
// //       value: count,
// //     };
// //   });

// //   const handleSubmit = (e) => {
// //     e.preventDefault();

// //     const newCompany = {
// //       ...form,
// //       tenth: Number(form.tenth),
// //       inter: Number(form.inter),
// //       bachelors: Number(form.bachelors),
// //       masters: form.masters ? Number(form.masters) : null,
// //       backlogs: Number(form.backlogs),
// //       openings: Number(form.openings),
// //     };

// //     if (editIndex !== null) {
// //       const updated = [...companies];
// //       updated[editIndex] = newCompany;
// //       setCompanies(updated);
// //       setEditIndex(null);
// //     } else {
// //       setCompanies([...companies, newCompany]);
// //     }

// //     setForm({
// //       name: "",
// //       type: "oncampus",
// //       tenth: "",
// //       inter: "",
// //       bachelors: "",
// //       masters: "",
// //       backlogs: "",
// //       openings: "",
// //       branches: [],
// //       year: "4",
// //     });
// //   };

// //   // 🔹 KPI CALCULATIONS
// //   const totalStudents = studentsData.length;

// //   const placedStudents = useMemo(
// //     () => studentsData.filter((s) => s.backlogs === 0),
// //     []
// //   );

// //   const unplacedStudents = useMemo(
// //     () => studentsData.filter((s) => s.backlogs > 0),
// //     []
// //   );

// //   const placementRate = totalStudents
// //     ? Math.round((placedStudents.length / totalStudents) * 100)
// //     : 0;

// //   return (
// //     <div className="min-h-screen bg-gray-100 p-4 md:p-6">
// //       {/* 🔹 HEADER */}
// //       <h1 className="text-2xl md:text-3xl font-bold mb-4">
// //         🎓 Placements Dashboard
// //       </h1>

// //       {/* 🔹 KPI CARDS */}
// //       <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
// //         <div className="bg-white p-4 rounded-xl shadow">
// //           <p className="text-gray-500 text-sm">Total Students</p>
// //           <h2 className="text-xl font-bold">{totalStudents}</h2>
// //         </div>

// //         <div className="bg-white p-4 rounded-xl shadow">
// //           <p className="text-gray-500 text-sm">Placed</p>
// //           <h2 className="text-xl font-bold text-green-600">
// //             {placedStudents.length}
// //           </h2>
// //         </div>

// //         <div className="bg-white p-4 rounded-xl shadow">
// //           <p className="text-gray-500 text-sm">Unplaced</p>
// //           <h2 className="text-xl font-bold text-red-600">
// //             {unplacedStudents.length}
// //           </h2>
// //         </div>

// //         <div className="bg-white p-4 rounded-xl shadow">
// //           <p className="text-gray-500 text-sm">Placement Rate</p>
// //           <h2 className="text-xl font-bold">{placementRate}%</h2>
// //         </div>
// //       </div>

// //       <div className="grid lg:grid-cols-3 gap-6">
// //         {/* 🔹 FORM */}
// //         <div className="lg:col-span-1 bg-white p-5 rounded-xl shadow h-fit sticky top-4">
// //           <h2 className="text-lg font-semibold mb-3">
// //             {editIndex !== null ? "✏️ Edit Company" : "➕ Add Company"}
// //           </h2>

// //           <form onSubmit={handleSubmit} className="space-y-3">
// //             <input
// //               name="name"
// //               placeholder="Company Name"
// //               value={form.name}
// //               onChange={handleChange}
// //               className="w-full border p-2 rounded"
// //               required
// //             />

// //             <div className="grid grid-cols-2 gap-2">
// //               <input name="tenth" placeholder="10th %" onChange={handleChange} className="border p-2 rounded" />
// //               <input name="inter" placeholder="Inter %" onChange={handleChange} className="border p-2 rounded" />
// //               <input name="bachelors" placeholder="Bachelors CGPA" onChange={handleChange} className="border p-2 rounded" />
// //               <input name="masters" placeholder="Masters CGPA" onChange={handleChange} className="border p-2 rounded" />
// //             </div>

// //             <div className="grid grid-cols-2 gap-2">
// //               <input name="backlogs" type="number" placeholder="Backlogs" onChange={handleChange} className="border p-2 rounded" />
// //               <input name="openings" type="number" placeholder="Openings" onChange={handleChange} className="border p-2 rounded" />
// //             </div>

// //             <select name="year" onChange={handleChange} className="w-full border p-2 rounded">
// //               <option value="4">4th Year</option>
// //               <option value="3">3rd Year</option>
// //               <option value="2">2nd Year</option>
// //             </select>

// //             <div className="flex flex-wrap gap-2">
// //               {branchesList.map((b) => (
// //                 <button
// //                   type="button"
// //                   key={b}
// //                   onClick={() => toggleBranch(b)}
// //                   className={`px-2 py-1 rounded text-sm border ${
// //                     form.branches.includes(b)
// //                       ? "bg-blue-600 text-white"
// //                       : "bg-gray-100"
// //                   }`}
// //                 >
// //                   {b}
// //                 </button>
// //               ))}
// //             </div>

// //             <button className="w-full bg-blue-600 text-white py-2 rounded">
// //               Create
// //             </button>
// //           </form>
// //         </div>

// //         {/* 🔹 COMPANY CARDS */}
// //         <div className="lg:col-span-2 grid md:grid-cols-2 gap-4">
// //           {companies.map((company, index) => {
// //             const eligible = getEligibleStudents(company);

// //             return (
// //               <div key={index} className="bg-white p-4 rounded-xl shadow">
// //                 <h3 className="font-semibold text-lg">{company.name}</h3>

// //                 <p className="text-sm text-gray-500">
// //                   Openings: {company.openings}
// //                 </p>

// //                 <p className="mt-2 font-medium">
// //                   Eligible Students: {eligible.length}
// //                 </p>
// //               </div>
// //             );
// //           })}
// //         </div>
// //         <div className="bg-white p-5 rounded-xl shadow mt-6">
// //           <h2 className="text-lg font-semibold mb-4">
// //             Department-wise Campus Placements
// //           </h2>

// //           <div className="w-full h-[300px]">
// //             <ResponsiveContainer>
// //               <PieChart>
// //                 <Pie
// //                   data={departmentData}
// //                   dataKey="value"
// //                   nameKey="name"
// //                   cx="50%"
// //                   cy="50%"
// //                   outerRadius={100}
// //                   label
// //                 >
// //                   {departmentData.map((entry, index) => (
// //                     <Cell key={index} fill={COLORS[index % COLORS.length]} />
// //                   ))}
// //                 </Pie>

// //                 <Tooltip />
// //                 <Legend />
// //               </PieChart>
// //             </ResponsiveContainer>
// //           </div>
// //         </div>
// //       </div>
// //     </div>
// //   );
// // }




// import React, { useEffect, useMemo, useState } from "react";

// export default function PlacementAdminPanel() {
//   const defaultForm = {
//     companyName: "",
//     role: "",
//     package: "",
//     driveDate: "",
//     driveTime: "",
//     location: "",
//     eligibility: "",
//     backlogs: "",
//     openings: "",
//     jobType: "",
//     mode: "",
//     description: "",
//   };

//   const seedPlacements = [
//     {
//       id: 1,
//       companyName: "Infosys",
//       role: "Software Engineer",
//       package: "6 LPA",
//       driveDate: "2026-04-08",
//       driveTime: "10:00",
//       location: "Vijayawada",
//       eligibility: "B.Tech CSE / IT",
//       backlogs: "0",
//       openings: "50",
//       jobType: "Full Time",
//       mode: "Offline",
//       description: "Campus drive for 2026 batch graduates.",
//     },
//     {
//       id: 2,
//       companyName: "Wipro",
//       role: "Project Engineer",
//       package: "4.5 LPA",
//       driveDate: "2026-04-03",
//       driveTime: "09:30",
//       location: "Hyderabad",
//       eligibility: "All Branches",
//       backlogs: "1",
//       openings: "30",
//       jobType: "Full Time",
//       mode: "Online",
//       description: "Assessment + interview process.",
//     },
//     {
//       id: 3,
//       companyName: "TCS",
//       role: "Developer",
//       package: "7 LPA",
//       driveDate: "2026-04-01",
//       driveTime: "11:00",
//       location: "Chennai",
//       eligibility: "B.Tech / MCA",
//       backlogs: "0",
//       openings: "100",
//       jobType: "Full Time",
//       mode: "Offline",
//       description: "Ninja / Digital role hiring.",
//     },
//   ];

//   const [form, setForm] = useState(defaultForm);
//   const [placements, setPlacements] = useState([]);
//   const [activeTab, setActiveTab] = useState("all");
//   const [search, setSearch] = useState("");
//   const [editId, setEditId] = useState(null);
//   const [sortBy, setSortBy] = useState("nearest");
//   const [showForm, setShowForm] = useState(false);

//   // Load from localStorage
//   useEffect(() => {
//     const saved = localStorage.getItem("placement_admin_data");
//     if (saved) {
//       setPlacements(JSON.parse(saved));
//     } else {
//       setPlacements(seedPlacements);
//     }
//   }, []);

//   // Save to localStorage
//   useEffect(() => {
//     localStorage.setItem("placement_admin_data", JSON.stringify(placements));
//   }, [placements]);

//   const today = new Date().toISOString().split("T")[0];

//   const getPlacementStatus = (driveDate) => {
//     if (!driveDate) return "upcoming";
//     if (driveDate > today) return "upcoming";
//     if (driveDate === today) return "current";
//     return "past";
//   };

//   const getStatusClasses = (status) => {
//     switch (status) {
//       case "upcoming":
//         return "bg-blue-100 text-blue-700 border-blue-200";
//       case "current":
//         return "bg-green-100 text-green-700 border-green-200";
//       case "past":
//         return "bg-gray-100 text-gray-700 border-gray-200";
//       default:
//         return "bg-gray-100 text-gray-700 border-gray-200";
//     }
//   };

//   const handleChange = (e) => {
//     setForm((prev) => ({
//       ...prev,
//       [e.target.name]: e.target.value,
//     }));
//   };

//   const resetForm = () => {
//     setForm(defaultForm);
//     setEditId(null);
//     setShowForm(false);
//   };

//   const handleSubmit = (e) => {
//     e.preventDefault();

//     if (!form.companyName || !form.role || !form.driveDate) {
//       alert("Please fill Company Name, Role, and Drive Date");
//       return;
//     }

//     if (editId) {
//       setPlacements((prev) =>
//         prev.map((item) =>
//           item.id === editId ? { ...form, id: editId } : item
//         )
//       );
//     } else {
//       const newPlacement = {
//         ...form,
//         id: Date.now(),
//       };
//       setPlacements((prev) => [newPlacement, ...prev]);
//     }

//     resetForm();
//   };

//   const handleEdit = (placement) => {
//     setForm({
//       companyName: placement.companyName || "",
//       role: placement.role || "",
//       package: placement.package || "",
//       driveDate: placement.driveDate || "",
//       driveTime: placement.driveTime || "",
//       location: placement.location || "",
//       eligibility: placement.eligibility || "",
//       backlogs: placement.backlogs || "",
//       openings: placement.openings || "",
//       jobType: placement.jobType || "",
//       mode: placement.mode || "",
//       description: placement.description || "",
//     });
//     setEditId(placement.id);
//     setShowForm(true);
//     window.scrollTo({ top: 0, behavior: "smooth" });
//   };

//   const handleDelete = (id) => {
//     const ok = window.confirm("Are you sure you want to delete this placement?");
//     if (!ok) return;

//     setPlacements((prev) => prev.filter((item) => item.id !== id));

//     if (editId === id) {
//       resetForm();
//     }
//   };

//   const stats = useMemo(() => {
//     const upcoming = placements.filter(
//       (p) => getPlacementStatus(p.driveDate) === "upcoming"
//     ).length;
//     const current = placements.filter(
//       (p) => getPlacementStatus(p.driveDate) === "current"
//     ).length;
//     const past = placements.filter(
//       (p) => getPlacementStatus(p.driveDate) === "past"
//     ).length;

//     return {
//       total: placements.length,
//       upcoming,
//       current,
//       past,
//     };
//   }, [placements]);

//   const filteredPlacements = useMemo(() => {
//     let data = [...placements];

//     // Search filter
//     if (search.trim()) {
//       const keyword = search.toLowerCase();
//       data = data.filter((item) => {
//         const text = `
//           ${item.companyName}
//           ${item.role}
//           ${item.location}
//           ${item.eligibility}
//           ${item.jobType}
//           ${item.mode}
//         `
//           .toLowerCase()
//           .replace(/\s+/g, " ");

//         return text.includes(keyword);
//       });
//     }

//     // Tab filter
//     if (activeTab !== "all") {
//       data = data.filter(
//         (item) => getPlacementStatus(item.driveDate) === activeTab
//       );
//     }

//     // Sort
//     if (sortBy === "nearest") {
//       data.sort((a, b) => new Date(a.driveDate) - new Date(b.driveDate));
//     } else if (sortBy === "latest") {
//       data.sort((a, b) => new Date(b.driveDate) - new Date(a.driveDate));
//     } else if (sortBy === "company") {
//       data.sort((a, b) => a.companyName.localeCompare(b.companyName));
//     }

//     return data;
//   }, [placements, search, activeTab, sortBy]);

//   const renderPlacementCard = (placement) => {
//     const status = getPlacementStatus(placement.driveDate);

//     return (
//       <div
//         key={placement.id}
//         className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition"
//       >
//         <div className="flex flex-col gap-3">
//           <div className="flex items-start justify-between gap-3">
//             <div>
//               <h3 className="text-xl font-bold text-gray-800">
//                 {placement.companyName}
//               </h3>
//               <p className="text-sm text-gray-500">{placement.role}</p>
//             </div>

//             <span
//               className={`text-xs font-semibold px-3 py-1 rounded-full border ${getStatusClasses(
//                 status
//               )}`}
//             >
//               {status.toUpperCase()}
//             </span>
//           </div>

//           <div className="grid grid-cols-2 gap-3 text-sm text-gray-700">
//             <p><span className="font-semibold">Package:</span> {placement.package || "-"}</p>
//             <p><span className="font-semibold">Date:</span> {placement.driveDate || "-"}</p>
//             <p><span className="font-semibold">Time:</span> {placement.driveTime || "-"}</p>
//             <p><span className="font-semibold">Location:</span> {placement.location || "-"}</p>
//             <p><span className="font-semibold">Eligibility:</span> {placement.eligibility || "-"}</p>
//             <p><span className="font-semibold">Backlogs:</span> {placement.backlogs || "0"}</p>
//             <p><span className="font-semibold">Openings:</span> {placement.openings || "-"}</p>
//             <p><span className="font-semibold">Mode:</span> {placement.mode || "-"}</p>
//             <p><span className="font-semibold">Job Type:</span> {placement.jobType || "-"}</p>
//           </div>

//           {placement.description && (
//             <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600">
//               {placement.description}
//             </div>
//           )}

//           <div className="flex flex-wrap gap-2 pt-2">
//             <button
//               onClick={() => handleEdit(placement)}
//               className="px-4 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium"
//             >
//               Edit
//             </button>

//             <button
//               onClick={() => handleDelete(placement.id)}
//               className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium"
//             >
//               Delete
//             </button>
//           </div>
//         </div>
//       </div>
//     );
//   };

//   return (
//     <div className="min-h-screen bg-gray-100 w-full">
//       {/* Top Bar */}
//       <div className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white">
//         <div className="w-full mx-auto px-4 md:px-8 py-6">
//           <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
//             <div>
//               <h1 className="text-3xl md:text-4xl font-bold">
//                 Placement Admin Panel
//               </h1>
//               <p className="text-blue-100 mt-1">
//                 Manage all campus drives in one place
//               </p>
//             </div>

//             <button
//               onClick={() => {
//                 setShowForm((prev) => !prev);
//                 if (showForm) {
//                   resetForm();
//                 }
//               }}
//               className="bg-white text-blue-700 font-semibold px-5 py-3 rounded-xl shadow hover:bg-blue-50"
//             >
//               {showForm ? "Close Form" : "+ Add Placement"}
//             </button>
//           </div>
//         </div>
//       </div>

//       <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6">
//         {/* Stats */}
//         <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
//           <div className="bg-white rounded-2xl p-5 shadow-sm border">
//             <p className="text-sm text-gray-500">Total Placements</p>
//             <h2 className="text-3xl font-bold text-gray-800 mt-1">{stats.total}</h2>
//           </div>

//           <div className="bg-white rounded-2xl p-5 shadow-sm border">
//             <p className="text-sm text-gray-500">Upcoming</p>
//             <h2 className="text-3xl font-bold text-blue-600 mt-1">{stats.upcoming}</h2>
//           </div>

//           <div className="bg-white rounded-2xl p-5 shadow-sm border">
//             <p className="text-sm text-gray-500">Current</p>
//             <h2 className="text-3xl font-bold text-green-600 mt-1">{stats.current}</h2>
//           </div>

//           <div className="bg-white rounded-2xl p-5 shadow-sm border">
//             <p className="text-sm text-gray-500">Past</p>
//             <h2 className="text-3xl font-bold text-gray-700 mt-1">{stats.past}</h2>
//           </div>
//         </div>

//         {/* Form */}
//         {showForm && (
//           <div className="bg-white rounded-2xl shadow-sm border p-6">
//             <div className="flex items-center justify-between mb-5">
//               <h2 className="text-2xl font-bold text-gray-800">
//                 {editId ? "Edit Placement" : "Create New Placement"}
//               </h2>
//             </div>

//             <form onSubmit={handleSubmit} className="space-y-5">
//               <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
//                 <input
//                   name="companyName"
//                   placeholder="Company Name"
//                   value={form.companyName}
//                   onChange={handleChange}
//                   className="border p-3 rounded-xl w-full"
//                 />

//                 <input
//                   name="role"
//                   placeholder="Role"
//                   value={form.role}
//                   onChange={handleChange}
//                   className="border p-3 rounded-xl w-full"
//                 />

//                 <input
//                   name="package"
//                   placeholder="Package (e.g. 6 LPA)"
//                   value={form.package}
//                   onChange={handleChange}
//                   className="border p-3 rounded-xl w-full"
//                 />

//                 <input
//                   type="date"
//                   name="driveDate"
//                   value={form.driveDate}
//                   onChange={handleChange}
//                   className="border p-3 rounded-xl w-full"
//                 />

//                 <input
//                   type="time"
//                   name="driveTime"
//                   value={form.driveTime}
//                   onChange={handleChange}
//                   className="border p-3 rounded-xl w-full"
//                 />

//                 <input
//                   name="location"
//                   placeholder="Location"
//                   value={form.location}
//                   onChange={handleChange}
//                   className="border p-3 rounded-xl w-full"
//                 />

//                 <input
//                   name="eligibility"
//                   placeholder="Eligibility"
//                   value={form.eligibility}
//                   onChange={handleChange}
//                   className="border p-3 rounded-xl w-full"
//                 />

//                 <input
//                   name="backlogs"
//                   type="text"
//                   placeholder="Backlogs"
//                   value={form.backlogs ?? ""}
//                   onChange={handleChange}
//                   className="border p-3 rounded-xl w-full placeholder:text-gray-500"
//                 />

//                 <input
//                   name="openings"
//                   type="text"
//                   placeholder="Openings"
//                   value={form.openings ?? ""}
//                   onChange={handleChange}
//                   className="border p-3 rounded-xl w-full placeholder:text-gray-500"
//                 />

//                 <select
//                   name="jobType"
//                   value={form.jobType}
//                   onChange={handleChange}
//                   className="border p-3 rounded-xl w-full"
//                 >
//                   <option value="">Select Job Type</option>
//                   <option value="Full Time">Full Time</option>
//                   <option value="Internship">Internship</option>
//                   <option value="Internship + FTE">Internship + FTE</option>
//                   <option value="Contract">Contract</option>
//                 </select>

//                 <select
//                   name="mode"
//                   value={form.mode}
//                   onChange={handleChange}
//                   className="border p-3 rounded-xl w-full"
//                 >
//                   <option value="">Select Mode</option>
//                   <option value="Online">Online</option>
//                   <option value="Offline">Offline</option>
//                   <option value="Hybrid">Hybrid</option>
//                 </select>
//               </div>

//               <textarea
//                 name="description"
//                 placeholder="Placement Description / Process Details"
//                 value={form.description}
//                 onChange={handleChange}
//                 rows={4}
//                 className="border p-3 rounded-xl w-full"
//               />

//               <div className="flex flex-wrap gap-3">
//                 <button
//                   type="submit"
//                   className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-3 rounded-xl font-semibold"
//                 >
//                   {editId ? "Update Placement" : "Create Placement"}
//                 </button>

//                 <button
//                   type="button"
//                   onClick={resetForm}
//                   className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-3 rounded-xl font-semibold"
//                 >
//                   Cancel
//                 </button>
//               </div>
//             </form>
//           </div>
//         )}

//         {/* Filters */}
//         <div className="bg-white rounded-2xl shadow-sm border p-5 space-y-4">
//           <div className="grid md:grid-cols-2 gap-4">
//             <input
//               type="text"
//               placeholder="Search by company, role, location, eligibility..."
//               value={search}
//               onChange={(e) => setSearch(e.target.value)}
//               className="border p-3 rounded-xl w-full"
//             />

//             <select
//               value={sortBy}
//               onChange={(e) => setSortBy(e.target.value)}
//               className="border p-3 rounded-xl w-full"
//             >
//               <option value="nearest">Sort by Nearest Date</option>
//               <option value="latest">Sort by Latest Date</option>
//               <option value="company">Sort by Company Name</option>
//             </select>
//           </div>

//           <div className="flex flex-wrap gap-2">
//             {["all", "upcoming", "current", "past"].map((tab) => (
//               <button
//                 key={tab}
//                 onClick={() => setActiveTab(tab)}
//                 className={`px-4 py-2 rounded-xl font-medium capitalize transition ${
//                   activeTab === tab
//                     ? tab === "upcoming"
//                       ? "bg-blue-600 text-white"
//                       : tab === "current"
//                       ? "bg-green-600 text-white"
//                       : tab === "past"
//                       ? "bg-gray-700 text-white"
//                       : "bg-indigo-600 text-white"
//                     : "bg-gray-100 text-gray-700 hover:bg-gray-200"
//                 }`}
//               >
//                 {tab}
//               </button>
//             ))}
//           </div>
//         </div>

//         {/* Placement List */}
//         <div className="space-y-4">
//           <div className="flex items-center justify-between">
//             <h2 className="text-2xl font-bold text-gray-800 capitalize">
//               {activeTab} Placements
//             </h2>
//             <p className="text-sm text-gray-500">
//               Showing {filteredPlacements.length} result(s)
//             </p>
//           </div>

//           {filteredPlacements.length > 0 ? (
//             <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
//               {filteredPlacements.map((placement) => renderPlacementCard(placement))}
//             </div>
//           ) : (
//             <div className="bg-white rounded-2xl shadow-sm border p-10 text-center text-gray-500">
//               No placements found for current filters
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }


"use client";

import React, { useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function SingleCollegePlacementERP() {
  // --------- CONFIG (Single College) ----------
  const COLLEGE_NAME = "ABC Engineering College";
  const today = new Date().toISOString().split("T")[0];

  // --------- SAMPLE DATA ----------
  const [placements, setPlacements] = useState([
    {
      id: 1,
      companyName: "Infosys",
      role: "Software Engineer",
      package: "6 LPA",
      driveDate: "2026-04-10",
      department: "CSE",
      openings: 50,
      rounds: 4,
      selectedStudents: 2,
    },
    {
      id: 2,
      companyName: "TCS",
      role: "Developer",
      package: "7 LPA",
      driveDate: "2026-04-03",
      department: "ECE",
      openings: 40,
      rounds: 3,
      selectedStudents: 1,
    },
    {
      id: 3,
      companyName: "Wipro",
      role: "Analyst",
      package: "4.5 LPA",
      driveDate: "2026-04-01",
      department: "IT",
      openings: 30,
      rounds: 5,
      selectedStudents: 2,
    },
  ]);

  // Each student belongs to ONE company (or blank if not applied yet)
  const [students, setStudents] = useState([
    { id: 1, name: "Rahul", department: "CSE", companyName: "Infosys", placed: true, roundsCleared: 4, finalRoundPlaced: true },
    { id: 2, name: "Priya", department: "CSE", companyName: "Infosys", placed: false, roundsCleared: 2, finalRoundPlaced: false },
    { id: 3, name: "Akhil", department: "ECE", companyName: "Infosys", placed: true, roundsCleared: 3, finalRoundPlaced: true },
    { id: 4, name: "Sneha", department: "ECE", companyName: "Infosys", placed: false, roundsCleared: 1, finalRoundPlaced: false },

    { id: 5, name: "Kiran", department: "EEE", companyName: "TCS", placed: true, roundsCleared: 3, finalRoundPlaced: true },
    { id: 6, name: "Harsha", department: "MECH", companyName: "TCS", placed: false, roundsCleared: 1, finalRoundPlaced: false },
    { id: 7, name: "Divya", department: "CSE", companyName: "TCS", placed: false, roundsCleared: 2, finalRoundPlaced: false },

    { id: 8, name: "Nikhil", department: "IT", companyName: "Wipro", placed: false, roundsCleared: 3, finalRoundPlaced: false },
    { id: 9, name: "Anjali", department: "IT", companyName: "Wipro", placed: true, roundsCleared: 5, finalRoundPlaced: true },
    { id: 10, name: "Vamsi", department: "CSE", companyName: "Wipro", placed: true, roundsCleared: 4, finalRoundPlaced: true },
  ]);

  // --------- UI STATE ----------
  const [activeMenu, setActiveMenu] = useState("dashboard"); // dashboard | placements | students | analytics
  const [showPlacementModal, setShowPlacementModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);

  const [placementSearch, setPlacementSearch] = useState("");
  const [studentSearch, setStudentSearch] = useState("");

  // --------- FORMS ----------
  const [placementForm, setPlacementForm] = useState({
    companyName: "",
    role: "",
    package: "",
    driveDate: "",
    department: "",
    openings: "",
    rounds: "",
    selectedStudents: "",
  });

  const [studentForm, setStudentForm] = useState({
    name: "",
    department: "",
    companyName: "",
    placed: "false",
    roundsCleared: "",
    finalRoundPlaced: "false",
  });

  // --------- HELPERS ----------
  const getPlacementStatus = (date) => {
    if (date > today) return "Upcoming";
    if (date === today) return "Current";
    return "Past";
  };

  const getStatusBadge = (status) => {
    if (status === "Upcoming") return "bg-blue-100 text-blue-700";
    if (status === "Current") return "bg-green-100 text-green-700";
    return "bg-gray-100 text-gray-700";
  };

  const resetPlacementForm = () =>
    setPlacementForm({
      companyName: "",
      role: "",
      package: "",
      driveDate: "",
      department: "",
      openings: "",
      rounds: "",
      selectedStudents: "",
    });

  const resetStudentForm = () =>
    setStudentForm({
      name: "",
      department: "",
      companyName: "",
      placed: "false",
      roundsCleared: "",
      finalRoundPlaced: "false",
    });

  // --------- DERIVED STATS ----------
  const stats = useMemo(() => {
    const totalStudents = students.length;
    const placedStudents = students.filter((s) => s.placed).length;
    const unplacedStudents = totalStudents - placedStudents;
    const finalRoundPlaced = students.filter((s) => s.finalRoundPlaced).length;
    const totalRoundsCleared = students.reduce((sum, s) => sum + Number(s.roundsCleared || 0), 0);

    return {
      totalStudents,
      placedStudents,
      unplacedStudents,
      finalRoundPlaced,
      totalRoundsCleared,
      totalPlacements: placements.length,
    };
  }, [students, placements]);

  const pieData = [
    { name: "Placed", value: stats.placedStudents },
    { name: "Unplaced", value: stats.unplacedStudents },
  ];

  const PIE_COLORS = ["#22c55e", "#ef4444"];

  // --------- FILTERED TABLES ----------
  const filteredPlacements = useMemo(() => {
    const q = placementSearch.toLowerCase();
    return placements.filter((p) => {
      const text = `${p.companyName} ${p.role} ${p.department} ${p.package}`.toLowerCase();
      return text.includes(q);
    });
  }, [placements, placementSearch]);

  const filteredStudents = useMemo(() => {
    const q = studentSearch.toLowerCase();
    return students.filter((s) => {
      const text = `${s.name} ${s.department} ${s.companyName}`.toLowerCase();
      return text.includes(q);
    });
  }, [students, studentSearch]);

  // --------- ANALYTICS: Each row = Company + Department ----------
  const departmentAnalytics = useMemo(() => {
    const map = {};

    students.forEach((student) => {
      const key = `${student.companyName || "Unassigned"}-${student.department}`;

      if (!map[key]) {
        map[key] = {
          companyName: student.companyName || "Unassigned",
          department: student.department,
          total: 0,
          placed: 0,
          unplaced: 0,
          roundsCleared: 0,
          finalRoundPlaced: 0,
          students: [], // store row-level students for tooltip
        };
      }

      map[key].total += 1;
      map[key].roundsCleared += Number(student.roundsCleared || 0);

      if (student.placed) map[key].placed += 1;
      else map[key].unplaced += 1;

      if (student.finalRoundPlaced) map[key].finalRoundPlaced += 1;

      map[key].students.push(student);
    });

    return Object.values(map).sort((a, b) => {
      if (a.companyName === b.companyName) {
        return a.department.localeCompare(b.department);
      }
      return a.companyName.localeCompare(b.companyName);
    });
  }, [students]);

  // --------- HANDLERS ----------
  const handlePlacementChange = (e) => {
    setPlacementForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleStudentChange = (e) => {
    setStudentForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAddPlacement = (e) => {
    e.preventDefault();

    if (!placementForm.companyName || !placementForm.role || !placementForm.driveDate || !placementForm.department) {
      alert("Please fill Company Name, Role, Drive Date, and Department");
      return;
    }

    const newPlacement = {
      id: Date.now(),
      companyName: placementForm.companyName,
      role: placementForm.role,
      package: placementForm.package,
      driveDate: placementForm.driveDate,
      department: placementForm.department,
      openings: Number(placementForm.openings || 0),
      rounds: Number(placementForm.rounds || 0),
      selectedStudents: Number(placementForm.selectedStudents || 0),
    };

    setPlacements((prev) => [newPlacement, ...prev]);
    resetPlacementForm();
    setShowPlacementModal(false);
  };

  const handleAddStudent = (e) => {
    e.preventDefault();

    if (!studentForm.name || !studentForm.department) {
      alert("Please fill Student Name and Department");
      return;
    }

    const newStudent = {
      id: Date.now(),
      name: studentForm.name,
      department: studentForm.department,
      companyName: studentForm.companyName || "",
      placed: studentForm.placed === "true",
      roundsCleared: Number(studentForm.roundsCleared || 0),
      finalRoundPlaced: studentForm.finalRoundPlaced === "true",
    };

    setStudents((prev) => [newStudent, ...prev]);
    resetStudentForm();
    setShowStudentModal(false);
  };

  const deletePlacement = (id) => {
    if (!window.confirm("Delete this placement drive?")) return;
    setPlacements((prev) => prev.filter((p) => p.id !== id));
  };

  const deleteStudent = (id) => {
    if (!window.confirm("Delete this student?")) return;
    setStudents((prev) => prev.filter((s) => s.id !== id));
  };

  // --------- REUSABLE UI ----------
  const StatCard = ({ title, value, color }) => (
    <div className="bg-white rounded-2xl p-5 shadow-sm border">
      <p className="text-sm text-gray-500">{title}</p>
      <h2 className={`text-3xl font-bold mt-2 ${color}`}>{value}</h2>
    </div>
  );

  // Tooltip shown on hover for each row
  const RowInfoTooltip = ({ row }) => {
    return (
      <div className="relative group inline-block">
        <span className="w-6 h-6 flex items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold cursor-pointer">
          i
        </span>

        <div className="absolute z-50 hidden group-hover:block top-8 right-0 md:left-0 bg-white border shadow-xl rounded-xl p-4 min-w-[300px] max-w-[360px]">
          <p className="font-semibold text-sm text-gray-800 mb-2">
            {row.companyName} - {row.department}
          </p>

          <div className="grid grid-cols-2 gap-2 text-sm mb-3">
            <p className="text-gray-600">
              Student Count: <span className="font-semibold text-gray-800">{row.total}</span>
            </p>
            <p className="text-gray-600">
              Placed: <span className="font-semibold text-green-600">{row.placed}</span>
            </p>
            <p className="text-gray-600">
              Unplaced: <span className="font-semibold text-red-600">{row.unplaced}</span>
            </p>
            <p className="text-gray-600">
              Final Placed: <span className="font-semibold text-blue-600">{row.finalRoundPlaced}</span>
            </p>
          </div>

          <div className="border-t pt-3">
            <p className="text-xs font-semibold text-gray-500 mb-2">Students</p>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {row.students.map((s) => (
                <div
                  key={s.id}
                  className="rounded-lg border p-2 text-xs flex items-center justify-between gap-2"
                >
                  <div>
                    <p className="font-semibold text-gray-800">{s.name}</p>
                    <p className="text-gray-500">Rounds Cleared: {s.roundsCleared}</p>
                  </div>

                  <span
                    className={`px-2 py-1 rounded-full text-[10px] font-semibold ${
                      s.placed
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {s.placed ? "Placed" : "Unplaced"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // --------- PAGE SECTIONS ----------
  const DashboardSection = () => (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-6 gap-4">
        <StatCard title="Total Students" value={stats.totalStudents} color="text-indigo-600" />
        <StatCard title="Placed" value={stats.placedStudents} color="text-green-600" />
        <StatCard title="Unplaced" value={stats.unplacedStudents} color="text-red-600" />
        <StatCard title="Final Round Placed" value={stats.finalRoundPlaced} color="text-blue-600" />
        <StatCard title="Rounds Cleared" value={stats.totalRoundsCleared} color="text-purple-600" />
        <StatCard title="Placement Drives" value={stats.totalPlacements} color="text-orange-600" />
      </div>

      {/* College name */}
      <div className="bg-white rounded-2xl shadow-sm border p-5">
        <h3 className="text-xl font-bold text-gray-800">College</h3>
        <p className="text-gray-600 mt-1">{COLLEGE_NAME}</p>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border">
        <h3 className="text-xl font-bold mb-4">Placed vs Unplaced</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={110} dataKey="value" label>
                {pieData.map((entry, index) => (
                  <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  const PlacementsSection = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <input
          type="text"
          placeholder="Search placements..."
          value={placementSearch}
          onChange={(e) => setPlacementSearch(e.target.value)}
          className="border px-4 py-3 rounded-xl w-full md:w-80"
        />

        <button
          onClick={() => setShowPlacementModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-semibold"
        >
          + Add Placement
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="p-5 border-b">
          <h3 className="text-xl font-bold">Placement Drives</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="p-4">Company</th>
                <th className="p-4">Role</th>
                <th className="p-4">Package</th>
                <th className="p-4">Date</th>
                <th className="p-4">Department</th>
                <th className="p-4">Openings</th>
                <th className="p-4">Rounds</th>
                <th className="p-4">Selected</th>
                <th className="p-4">Status</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlacements.map((p) => {
                const status = getPlacementStatus(p.driveDate);
                return (
                  <tr key={p.id} className="border-t hover:bg-gray-50">
                    <td className="p-4 font-semibold">{p.companyName}</td>
                    <td className="p-4">{p.role}</td>
                    <td className="p-4">{p.package}</td>
                    <td className="p-4">{p.driveDate}</td>
                    <td className="p-4">{p.department}</td>
                    <td className="p-4">{p.openings}</td>
                    <td className="p-4">{p.rounds}</td>
                    <td className="p-4">{p.selectedStudents}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(status)}`}>
                        {status}
                      </span>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => deletePlacement(p.id)}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredPlacements.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-6 text-center text-gray-500">
                    No placements found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );


  const AnalyticsSection = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="p-5 border-b">
          <h3 className="text-xl font-bold">Department Wise Analytics</h3>
          <p className="text-sm text-gray-500 mt-1">
            Each row = Company + Department. Hover the info icon to see student count and row-level student list.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-4 text-left">Company Name</th>
                <th className="p-4 text-left">Department</th>
                <th className="p-4 text-left">Total Students</th>
                <th className="p-4 text-left">Placed</th>
                <th className="p-4 text-left">Unplaced</th>
                <th className="p-4 text-left">Rounds Cleared</th>
                <th className="p-4 text-left">Final Round Placed</th>
                <th className="p-4 text-left">Info</th>
              </tr>
            </thead>
            <tbody>
              {departmentAnalytics.map((row, i) => (
                <tr key={i} className="border-t hover:bg-gray-50">
                  <td className="p-4 font-semibold">{row.companyName}</td>
                  <td className="p-4">{row.department}</td>
                  <td className="p-4">{row.total}</td>
                  <td className="p-4 text-green-600 font-semibold">{row.placed}</td>
                  <td className="p-4 text-red-600 font-semibold">{row.unplaced}</td>
                  <td className="p-4">{row.roundsCleared}</td>
                  <td className="p-4 text-blue-600 font-semibold">{row.finalRoundPlaced}</td>
                  <td className="p-4">
                    <RowInfoTooltip row={row} />
                  </td>
                </tr>
              ))}

              {departmentAnalytics.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-gray-500">
                    No analytics data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // --------- MAIN RENDER ----------
  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className="w-72 bg-slate-900 text-white min-h-screen p-6 hidden lg:block">
        <h1 className="text-2xl font-bold mb-2">Placement ERP</h1>
        <p className="text-sm text-slate-300 mb-8">{COLLEGE_NAME}</p>

        <nav className="space-y-3">
          {[
            { key: "dashboard", label: "Dashboard" },
            { key: "placements", label: "Placements" },
            { key: "analytics", label: "Department Analytics" },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveMenu(item.key)}
              className={`w-full text-left px-4 py-3 rounded-xl ${
                activeMenu === item.key
                  ? "bg-blue-600"
                  : "bg-slate-800 hover:bg-slate-700"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1">
        {/* Top Navbar */}
        <header className="bg-white border-b px-4 md:px-8 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {activeMenu === "dashboard" && "Dashboard"}
              {activeMenu === "placements" && "Placement Drives"}
              {activeMenu === "analytics" && "Department Wise Analytics"}
            </h2>
            <p className="text-sm text-gray-500">
              Single College Placement Management System
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowPlacementModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl font-semibold"
            >
              + Add Placement
            </button>

            <button
              onClick={() => setShowStudentModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-xl font-semibold"
            >
              + Add Student
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 md:p-8">
          {activeMenu === "dashboard" && <DashboardSection />}
          {activeMenu === "placements" && <PlacementsSection />}
          {activeMenu === "analytics" && <AnalyticsSection />}
        </main>
      </div>

      {/* Add Placement Modal */}
      {showPlacementModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-2xl font-bold">Add New Placement</h3>
              <button
                onClick={() => {
                  setShowPlacementModal(false);
                  resetPlacementForm();
                }}
                className="text-gray-500 hover:text-black text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddPlacement} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <input
                  name="companyName"
                  placeholder="Company Name"
                  value={placementForm.companyName}
                  onChange={handlePlacementChange}
                  className="border p-3 rounded-xl"
                />
                <input
                  name="role"
                  placeholder="Role"
                  value={placementForm.role}
                  onChange={handlePlacementChange}
                  className="border p-3 rounded-xl"
                />
                <input
                  name="package"
                  placeholder="Package (e.g. 6 LPA)"
                  value={placementForm.package}
                  onChange={handlePlacementChange}
                  className="border p-3 rounded-xl"
                />
                <input
                  type="date"
                  name="driveDate"
                  value={placementForm.driveDate}
                  onChange={handlePlacementChange}
                  className="border p-3 rounded-xl"
                />
                <input
                  name="department"
                  placeholder="Department (e.g. CSE)"
                  value={placementForm.department}
                  onChange={handlePlacementChange}
                  className="border p-3 rounded-xl"
                />
                <input
                  name="openings"
                  placeholder="Openings"
                  value={placementForm.openings}
                  onChange={handlePlacementChange}
                  className="border p-3 rounded-xl"
                />
                <input
                  name="rounds"
                  placeholder="Number of Rounds"
                  value={placementForm.rounds}
                  onChange={handlePlacementChange}
                  className="border p-3 rounded-xl"
                />
                <input
                  name="selectedStudents"
                  placeholder="Selected Students"
                  value={placementForm.selectedStudents}
                  onChange={handlePlacementChange}
                  className="border p-3 rounded-xl"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-semibold"
                >
                  Save Placement
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowPlacementModal(false);
                    resetPlacementForm();
                  }}
                  className="bg-gray-200 hover:bg-gray-300 px-5 py-3 rounded-xl font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showStudentModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-2xl font-bold">Add New Student</h3>
              <button
                onClick={() => {
                  setShowStudentModal(false);
                  resetStudentForm();
                }}
                className="text-gray-500 hover:text-black text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddStudent} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <input
                  name="name"
                  placeholder="Student Name"
                  value={studentForm.name}
                  onChange={handleStudentChange}
                  className="border p-3 rounded-xl"
                />
                <input
                  name="department"
                  placeholder="Department (e.g. CSE)"
                  value={studentForm.department}
                  onChange={handleStudentChange}
                  className="border p-3 rounded-xl"
                />

                {/* Company dropdown from placements */}
                <select
                  name="companyName"
                  value={studentForm.companyName}
                  onChange={handleStudentChange}
                  className="border p-3 rounded-xl"
                >
                  <option value="">Select Company (optional)</option>
                  {placements.map((p) => (
                    <option key={p.id} value={p.companyName}>
                      {p.companyName}
                    </option>
                  ))}
                </select>

                <input
                  name="roundsCleared"
                  placeholder="Rounds Cleared"
                  value={studentForm.roundsCleared}
                  onChange={handleStudentChange}
                  className="border p-3 rounded-xl"
                />

                <select
                  name="placed"
                  value={studentForm.placed}
                  onChange={handleStudentChange}
                  className="border p-3 rounded-xl"
                >
                  <option value="false">Unplaced</option>
                  <option value="true">Placed</option>
                </select>

                <select
                  name="finalRoundPlaced"
                  value={studentForm.finalRoundPlaced}
                  onChange={handleStudentChange}
                  className="border p-3 rounded-xl"
                >
                  <option value="false">Final Round Not Cleared</option>
                  <option value="true">Final Round Placed</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-xl font-semibold"
                >
                  Save Student
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowStudentModal(false);
                    resetStudentForm();
                  }}
                  className="bg-gray-200 hover:bg-gray-300 px-5 py-3 rounded-xl font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}