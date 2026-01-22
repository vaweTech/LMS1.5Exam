"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "../../../lib/firebase";
import { mcqDb } from "../../../lib/firebaseMCQs";
import { collection, getDocs, query, where } from "firebase/firestore";
import CheckAdminAuth from "../../../lib/CheckAdminAuth";

export default function AdminAssignmentsPage() {
  const router = useRouter();
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedAssignmentType, setSelectedAssignmentType] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      // Fetch all courses from primary Firebase
      const coursesSnap = await getDocs(collection(db, "courses"));
      const coursesData = [];
      
      for (const courseDoc of coursesSnap.docs) {
        const courseData = { id: courseDoc.id, ...courseDoc.data() };
        
        // Fetch assignments for each course from MCQ Firebase
        const assignmentsSnap = await getDocs(collection(mcqDb, "courses", courseDoc.id, "assignments"));
        courseData.assignments = assignmentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Add all courses (even if they don't have assignments yet)
        coursesData.push(courseData);
      }
      
      setCourses(coursesData);
    } catch (error) {
      console.error("Error fetching courses:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async (courseId, assignmentId) => {
    try {
      // Fetch submissions from MCQ Firebase
      const submissionsSnap = await getDocs(
        collection(mcqDb, "courses", courseId, "assignments", assignmentId, "submissions")
      );
      
      const submissionsData = submissionsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        submittedAt: doc.data().submittedAt?.toDate?.() || new Date()
      }));
      
      // Sort by submission date (newest first)
      submissionsData.sort((a, b) => b.submittedAt - a.submittedAt);
      
      setSubmissions(submissionsData);
    } catch (error) {
      console.error("Error fetching submissions:", error);
    }
  };

  // Get available assignment types for selected course
  const getAvailableTypes = (course) => {
    if (!course || !course.assignments) return [];
    const types = new Set(course.assignments.map(a => a.type));
    return Array.from(types);
  };

  // Get available days for selected course and type
  const getAvailableDays = (course, type) => {
    if (!course || !course.assignments || !type) return [];
    const filteredAssignments = course.assignments.filter(a => a.type === type);
    const days = filteredAssignments
      .map(a => a.day || 1)
      .filter((day, index, self) => self.indexOf(day) === index)
      .sort((a, b) => a - b);
    return days;
  };

  // Get assignment for selected day
  const getAssignmentForDay = (course, type, day) => {
    if (!course || !course.assignments || !type || !day) return null;
    const assignment = course.assignments.find(a => a.type === type && (a.day || 1) === day);
    return assignment || null;
  };

  const handleDaySelect = async (day) => {
    setSelectedDay(day);
    const assignment = getAssignmentForDay(selectedCourse, selectedAssignmentType, day);
    setSelectedAssignment(assignment);
    if (assignment && selectedCourse) {
      await fetchSubmissions(selectedCourse.id, assignment.id);
    } else {
      setSubmissions([]);
    }
  };

  // Grading UI and handlers removed per requirements

  const calculateMCQScore = (submission, assignment) => {
    if (assignment.type !== 'mcq' || !submission.mcqAnswers) return null;
    
    let correctAnswers = 0;
    let totalQuestions = assignment.questions?.length || 0;
    
    assignment.questions?.forEach((question, index) => {
      if (submission.mcqAnswers[index] === question.correctAnswer) {
        correctAnswers++;
      }
    });
    
    return totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
  };

  if (loading) return (
    <CheckAdminAuth>
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading courses...</p>
        </div>
      </div>
    </CheckAdminAuth>
  );

  return (
    <CheckAdminAuth>
      <div className="min-h-screen bg-gray-50 p-6">
      <button
          onClick={() => router.back()}
          className={`mb-4 px-4 py-2 rounded bg-gray-500 hover:bg-gray-600 text-white`}
        >
          ⬅ Back
        </button>
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800">Progress Test Submissions</h1>
            {courses.length > 0 && (
              <p className="text-gray-600 mt-2">
                {courses.length} total {courses.length === 1 ? 'course' : 'courses'}
              </p>
            )}
          </div>

          {courses.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <svg className="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <h3 className="text-lg font-medium text-gray-600 mb-2">No Courses Available Yet</h3>
              <p className="text-gray-500">
                Please create courses first in the Admin Tutorials section.
              </p>
            </div>
          ) : (
            <>
              {/* Three-Step Selection: Course → Type → Day */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Step 1: Course Selection */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">1. Select Course</h2>
              <select
                id="courseSelect"
                name="courseSelect"
                value={selectedCourse?.id || ""}
                onChange={(e) => {
                  const course = courses.find(c => c.id === e.target.value);
                  setSelectedCourse(course);
                  setSelectedAssignmentType(null);
                  setSelectedDay(null);
                  setSelectedAssignment(null);
                  setSubmissions([]);
                }}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-cyan-500 focus:border-cyan-500"
              >
                <option value="">Choose a course...</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Step 2: Assignment Type Selection */}
            {selectedCourse && getAvailableTypes(selectedCourse).length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">2. Select Type</h2>
                <select
                  id="typeSelect"
                  name="typeSelect"
                  value={selectedAssignmentType || ""}
                  onChange={(e) => {
                    setSelectedAssignmentType(e.target.value);
                    setSelectedDay(null);
                    setSelectedAssignment(null);
                    setSubmissions([]);
                  }}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-cyan-500 focus:border-cyan-500"
                >
                  <option value="">Choose MCQ or Coding...</option>
                  {getAvailableTypes(selectedCourse).map((type) => (
                    <option key={type} value={type}>
                      {type.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Step 3: Day Selection */}
            {selectedCourse && selectedAssignmentType && getAvailableDays(selectedCourse, selectedAssignmentType).length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">3. Select Day</h2>
                <select
                  id="daySelect"
                  name="daySelect"
                  value={selectedDay || ""}
                  onChange={(e) => handleDaySelect(parseInt(e.target.value))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-cyan-500 focus:border-cyan-500"
                >
                  <option value="">Choose a day...</option>
                  {getAvailableDays(selectedCourse, selectedAssignmentType).map((day) => (
                    <option key={day} value={day}>
                      Day {day}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Submissions List */}
          {selectedAssignment && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <h2 className="text-2xl font-semibold text-gray-800">
                  Submissions for: {selectedAssignment.title}
                </h2>
                <p className="text-gray-600 mt-2">
                  Course: {selectedCourse.title} | Type: {selectedAssignment.type.toUpperCase()} | Day: {selectedAssignment.day || 1}
                </p>
              </div>

              {submissions.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No submissions yet for this assignment.
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {submissions.map((submission) => {
                    const mcqScore = selectedAssignment.type === 'mcq'
                      ? calculateMCQScore(submission, selectedAssignment)
                      : null;
                    const codingScore = selectedAssignment.type === 'coding'
                      ? (typeof submission.autoScore === 'number' ? submission.autoScore : (submission.testSummary && submission.testSummary.totalCount ? Math.round((submission.testSummary.passCount / submission.testSummary.totalCount) * 100) : null))
                      : null;
                    const displayAutoScore = selectedAssignment.type === 'mcq'
                      ? (mcqScore !== null && mcqScore !== undefined ? `${mcqScore.toFixed(1)}%` : 'N/A')
                      : (codingScore !== null && codingScore !== undefined ? `${codingScore}%` : 'N/A');
                    return (
                      <div key={submission.id} className="p-6">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="text-lg font-medium text-gray-800">
                              {submission.studentName}
                            </h3>
                            <p className="text-sm text-gray-600">
                              Submitted: {submission.submittedAt.toLocaleString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500">Auto Score</p>
                            <p className="text-xl font-semibold text-gray-800">{displayAutoScore}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
            </>
          )}
        </div>
      </div>
    </CheckAdminAuth>
  );
}
