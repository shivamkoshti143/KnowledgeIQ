const BASE_URL = "http://localhost:4001/api";

async function apiRequest(method, path, body = null, token = null, isFormData = false) {
  const headers = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  let reqBody = undefined;
  if (isFormData) {
    reqBody = body;
  } else if (body) {
    headers["Content-Type"] = "application/json";
    reqBody = JSON.stringify(body);
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: reqBody
  });

  let data = null;
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    try {
      data = await res.json();
    } catch (_) {}
  } else {
    try {
      data = await res.text();
    } catch (_) {}
  }

  return { status: res.status, data };
}

const testResults = [];

function record(suite, name, passed, details = "") {
  testResults.push({ suite, name, passed, details });
  const icon = passed ? "✅" : "❌";
  console.log(`${icon} [${suite}] ${name}${details ? ` -> ${details}` : ""}`);
}

async function runTestSuite() {
  console.log("==================================================");
  console.log("   ABM-TaskIQ Comprehensive Automated Test Suite   ");
  console.log("==================================================\n");

  let adminToken = "";
  let employeeToken = "";
  let testUserId = null;
  let testTaskId = null;
  let testKnowledgeId = null;
  let testRoleId = null;
  let validDeptId = null;
  let validCatId = null;

  // ----------------------------------------------------
  // 1. AUTHENTICATION & SESSION TESTS
  // ----------------------------------------------------
  console.log("--- 1. Authentication & Session Module ---");
  try {
    // Admin OTP send & verify
    const adminLoginOtpRes = await apiRequest("POST", "/auth/login", { email: "admin@abm.com" });
    record("Auth", "Request Login OTP for Admin", adminLoginOtpRes.status === 200);

    const adminVerifyRes = await apiRequest("POST", "/auth/verify-otp", { email: "admin@abm.com", otp: "123456", mode: "login" });
    const adminLoginPassed = adminVerifyRes.status === 200 && adminVerifyRes.data?.token && adminVerifyRes.data?.user?.role === "admin";
    adminToken = adminVerifyRes.data?.token;
    record("Auth", "Verify OTP and Login as Admin", adminLoginPassed, `Role: ${adminVerifyRes.data?.user?.role}`);

    // Employee OTP send & verify
    const empLoginOtpRes = await apiRequest("POST", "/auth/login", { email: "shailesh.gupta@abmindia.com" });
    record("Auth", "Request Login OTP for Employee", empLoginOtpRes.status === 200);

    const empVerifyRes = await apiRequest("POST", "/auth/verify-otp", { email: "shailesh.gupta@abmindia.com", otp: "123456", mode: "login" });
    const empLoginPassed = empVerifyRes.status === 200 && empVerifyRes.data?.token && empVerifyRes.data?.user?.role === "employee";
    employeeToken = empVerifyRes.data?.token;
    record("Auth", "Verify OTP and Login as Employee", empLoginPassed, `Role: ${empVerifyRes.data?.user?.role}`);

    // Test Invalid OTP rejection
    const invalidOtpRes = await apiRequest("POST", "/auth/verify-otp", { email: "admin@abm.com", otp: "000000", mode: "login" });
    record("Auth", "Reject invalid OTP", invalidOtpRes.status === 400);

    // Bootstrap for dynamic IDs
    const bRes = await apiRequest("GET", "/bootstrap", null, adminToken);
    validDeptId = bRes.data?.departments?.[0]?.id || 2;
    validCatId = bRes.data?.categories?.[0]?.id || 2;
    record("Bootstrap", "Fetch platform bootstrap payload", bRes.status === 200, `Dept ID: ${validDeptId}, Cat ID: ${validCatId}`);
    record("Bootstrap", "Permissions payload attached to currentUser", Array.isArray(bRes.data?.currentUser?.permissions));

    // Test Signup flow with automatic User role assignment
    const randomEmail = `test.qa.${Date.now()}@abm.com`;
    const signupOtpRes = await apiRequest("POST", "/auth/signup", {
      email: randomEmail,
      name: "QA Automated User",
      departmentId: validDeptId
    });
    record("Auth", "Send OTP for New User Signup", signupOtpRes.status === 200);

    const signupVerifyRes = await apiRequest("POST", "/auth/verify-otp", {
      email: randomEmail,
      otp: "123456",
      mode: "signup"
    });
    const signupPassed = signupVerifyRes.status === 200 && signupVerifyRes.data?.user?.email === randomEmail;
    testUserId = signupVerifyRes.data?.user?.id;
    record("Auth", "Verify Signup & Create Account", signupPassed, `New User ID: ${testUserId}`);

    // Verify auto-assigned role for newly signed up user
    const signupBootstrapRes = await apiRequest("GET", "/bootstrap", null, signupVerifyRes.data?.token);
    const userRoleId = signupBootstrapRes.data?.currentUser?.role_id;
    record("Auth", "Verify Automatic 'User' Role Assignment on Signup", !!userRoleId, `Assigned role_id: ${userRoleId}`);
  } catch (err) {
    record("Auth", "Authentication flow error", false, err.message);
  }

  // ----------------------------------------------------
  // 2. EMPLOYEE TASK SUBMISSION & WORKFLOW
  // ----------------------------------------------------
  console.log("\n--- 2. Employee Knowledge / Task Submission ---");
  try {
    // Create Task with FormData
    const taskFormData = new FormData();
    taskFormData.append("title", "QA Auto-Test Task Submission");
    taskFormData.append("departmentId", String(validDeptId));
    taskFormData.append("categoryId", String(validCatId));
    taskFormData.append("description", "Comprehensive end-to-end automated task guideline description for QA review.");
    taskFormData.append("status", "pending");

    const createTaskRes = await apiRequest("POST", "/tasks", taskFormData, employeeToken, true);
    testTaskId = createTaskRes.data?.id;
    record("Tasks", "Submit Knowledge Task Guideline", createTaskRes.status === 201 && !!testTaskId, `Task ID: ${testTaskId}`);

    // Fetch Tasks as Employee
    const getTasksRes = await apiRequest("GET", "/tasks", null, employeeToken);
    const tasksList = Array.isArray(getTasksRes.data) ? getTasksRes.data : [];
    const taskFound = tasksList.find((t) => t.id === testTaskId);
    record("Tasks", "Fetch employee submitted tasks (Pending status)", taskFound && taskFound.status === "pending");
  } catch (err) {
    record("Tasks", "Task workflow error", false, err.message);
  }

  // ----------------------------------------------------
  // 3. ADMIN APPROVALS & REVIEWS
  // ----------------------------------------------------
  console.log("\n--- 3. Admin Approvals & Quality Queue ---");
  try {
    // Check Task in Approvals Queue
    const adminTasksRes = await apiRequest("GET", "/tasks", null, adminToken);
    const adminTasksList = Array.isArray(adminTasksRes.data) ? adminTasksRes.data : [];
    const pendingTaskInAdmin = adminTasksList.find((t) => t.id === testTaskId);
    record("Approvals", "Pending task visible in Admin Queue", !!pendingTaskInAdmin);

    // Approve Task Guideline via POST /api/tasks/:id/review
    const approveTaskRes = await apiRequest("POST", `/tasks/${testTaskId}/review`, {
      decision: "approved",
      remarks: "Approved by QA automated suite."
    }, adminToken);
    record("Approvals", "Approve Task Guideline via review endpoint", approveTaskRes.status === 200);

    // Verify task is now approved
    const verifyApprovedRes = await apiRequest("GET", `/tasks/${testTaskId}`, null, employeeToken);
    record("Approvals", "Verify task status transitioned to 'approved'", verifyApprovedRes.status === 200 && verifyApprovedRes.data?.status === "approved");
  } catch (err) {
    record("Approvals", "Approvals workflow error", false, err.message);
  }

  // ----------------------------------------------------
  // 4. KNOWLEDGE POSTS & RECOMMENDATION
  // ----------------------------------------------------
  console.log("\n--- 4. Knowledge Posts & Management ---");
  try {
    // Create Knowledge Post with FormData
    const kFormData = new FormData();
    kFormData.append("title", "QA Auto-Test Knowledge Post");
    kFormData.append("departmentId", String(validDeptId));
    kFormData.append("categoryId", String(validCatId));
    kFormData.append("tags", "testing, automation, qa");
    kFormData.append("description", "Knowledge article documenting architecture patterns and guidelines.");
    kFormData.append("status", "published");

    const createKRes = await apiRequest("POST", "/knowledge", kFormData, adminToken, true);
    testKnowledgeId = createKRes.data?.id;
    record("Knowledge", "Create Knowledge Post (Published)", createKRes.status === 201 && !!testKnowledgeId, `Post ID: ${testKnowledgeId}`);

    // Recommend Knowledge Post
    const toggleRecRes = await apiRequest("POST", `/knowledge/${testKnowledgeId}/recommend`, { isRecommended: true }, adminToken);
    record("Knowledge", "Toggle Recommendation flag on Knowledge Post", toggleRecRes.status === 200);

    // Fetch Recommended feed
    const recFeedRes = await apiRequest("GET", "/knowledge", null, employeeToken);
    const kList = Array.isArray(recFeedRes.data) ? recFeedRes.data : [];
    const recFound = kList.find((k) => k.id === testKnowledgeId && k.isRecommended);
    record("Knowledge", "Recommended post appears in curated feed", !!recFound);
  } catch (err) {
    record("Knowledge", "Knowledge post workflow error", false, err.message);
  }

  // ----------------------------------------------------
  // 5. BOOKMARKS, COMMENTS, & ENGAGEMENT
  // ----------------------------------------------------
  console.log("\n--- 5. Bookmarks, Discussions & AI Assistant ---");
  try {
    // Bookmark Knowledge Post via POST /api/bookmarks
    const bookmarkRes = await apiRequest("POST", "/bookmarks", {
      contentType: "knowledge",
      contentId: testKnowledgeId
    }, employeeToken);
    record("Bookmarks", "Add Bookmark on Knowledge Post", bookmarkRes.status === 201);

    // Verify Bookmarks feed
    const getBookmarksRes = await apiRequest("GET", "/bookmarks", null, employeeToken);
    const bmList = Array.isArray(getBookmarksRes.data) ? getBookmarksRes.data : [];
    const bmFound = bmList.find((b) => Number(b.contentId) === Number(testKnowledgeId) && b.contentType === "knowledge");
    record("Bookmarks", "Bookmarked post visible in Bookmarks feed", !!bmFound);

    // Remove Bookmark
    const delBmRes = await apiRequest("DELETE", "/bookmarks", {
      contentType: "knowledge",
      contentId: testKnowledgeId
    }, employeeToken);
    record("Bookmarks", "Delete Bookmark on item", delBmRes.status === 200);

    // Post Comment in Discussion
    if (testTaskId) {
      const commentRes = await apiRequest("POST", `/tasks/${testTaskId}/comments`, {
        body: "Great QA documentation! Verified by test automation."
      }, employeeToken);
      record("Comments", "Post discussion comment on item", commentRes.status === 200 || commentRes.status === 201);
    }

    // Ask AI Knowledge Assistant
    const aiRes = await apiRequest("POST", "/ai/chat", {
      message: "What is QA Auto-Test Knowledge Post about?"
    }, employeeToken);
    record("AI Assistant", "Query AI Assistant with contextual knowledge retrieval", aiRes.status === 200 && !!aiRes.data?.reply);
  } catch (err) {
    record("Engagement", "Bookmarks & engagement workflow error", false, err.message);
  }

  // ----------------------------------------------------
  // 6. NOTIFICATIONS SYSTEM
  // ----------------------------------------------------
  console.log("\n--- 6. Notifications ---");
  try {
    const notifsRes = await apiRequest("GET", "/notifications", null, employeeToken);
    record("Notifications", "Fetch user notifications feed", notifsRes.status === 200 && Array.isArray(notifsRes.data));

    const readAllRes = await apiRequest("POST", "/notifications/read-all", {}, employeeToken);
    record("Notifications", "Mark all notifications as read", readAllRes.status === 200);
  } catch (err) {
    record("Notifications", "Notification workflow error", false, err.message);
  }

  // ----------------------------------------------------
  // 7. ROLE MANAGEMENT & ACCESS CONTROL
  // ----------------------------------------------------
  console.log("\n--- 7. Role Management & Permissions ---");
  try {
    // Fetch Roles
    const getRolesRes = await apiRequest("GET", "/admin/roles", null, adminToken);
    record("Roles", "Fetch role definitions list", getRolesRes.status === 200 && Array.isArray(getRolesRes.data));

    // Create Custom Role
    const roleName = `QA_Auditor_${Date.now()}`;
    const createRoleRes = await apiRequest("POST", "/admin/roles", {
      role_name: roleName,
      permission_ids: [1, 2, 3, 4, 5]
    }, adminToken);
    testRoleId = createRoleRes.data?.role?.id;
    record("Roles", "Create custom role with custom permissions", createRoleRes.status === 201 && !!testRoleId, `Role ID: ${testRoleId}`);

    // Assign Role to User
    if (testUserId && testRoleId) {
      const assignRoleRes = await apiRequest("POST", "/admin/role-assignments", {
        userId: testUserId,
        roleId: testRoleId
      }, adminToken);
      record("Roles", "Assign custom role to user account", assignRoleRes.status === 200);
    }

    // Delete Custom Role
    if (testRoleId) {
      const deleteRoleRes = await apiRequest("DELETE", `/admin/roles/${testRoleId}`, null, adminToken);
      record("Roles", "Delete custom role", deleteRoleRes.status === 200);
    }

    // Verify non-admin blocked from admin endpoints
    const forbiddenRes = await apiRequest("GET", "/admin/roles", null, employeeToken);
    record("Access Control", "Block non-admin from administrative endpoints (403 Forbidden)", forbiddenRes.status === 403);
  } catch (err) {
    record("Roles", "Role management workflow error", false, err.message);
  }

  // ----------------------------------------------------
  // 8. TAXONOMY & SITE SETTINGS
  // ----------------------------------------------------
  console.log("\n--- 8. Taxonomy & Site Settings ---");
  try {
    // Add Department
    const deptName = `QA_Dept_${Date.now()}`;
    const addDeptRes = await apiRequest("POST", "/departments", { name: deptName }, adminToken);
    const newDeptId = addDeptRes.data?.id;
    record("Taxonomy", "Add new department in taxonomy", addDeptRes.status === 201 && !!newDeptId);

    // Delete Department
    if (newDeptId) {
      const delDeptRes = await apiRequest("DELETE", `/departments/${newDeptId}`, null, adminToken);
      record("Taxonomy", "Delete department in taxonomy", delDeptRes.status === 200);
    }

    // Update Site Settings
    const updateSettingsRes = await apiRequest("POST", "/site-settings", {
      portalName: "ABM TaskIQ",
      portalTagline: "Smart task guidance and learning platform"
    }, adminToken);
    record("Site Settings", "Update portal site settings", updateSettingsRes.status === 200);
  } catch (err) {
    record("Taxonomy", "Taxonomy & site settings error", false, err.message);
  }

  // ----------------------------------------------------
  // 9. CLEANUP TEST ARTIFACTS
  // ----------------------------------------------------
  console.log("\n--- 9. Cleanup Test Artifacts ---");
  try {
    if (testTaskId) {
      const delTaskRes = await apiRequest("DELETE", `/tasks/${testTaskId}`, { reason: "Automated QA cleanup" }, adminToken);
      record("Cleanup", "Clean up test task", delTaskRes.status === 200);
    }
    if (testKnowledgeId) {
      const delKRes = await apiRequest("DELETE", `/knowledge/${testKnowledgeId}`, { reason: "Automated QA cleanup" }, adminToken);
      record("Cleanup", "Clean up test knowledge post", delKRes.status === 200);
    }
    if (testUserId) {
      const { pool } = require("../server/db");
      await pool.query("DELETE FROM users WHERE id = ?", [testUserId]);
      record("Cleanup", "Clean up test user account", true);
    }
  } catch (err) {
    record("Cleanup", "Cleanup error", false, err.message);
  }

  // ----------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------
  console.log("\n==================================================");
  const total = testResults.length;
  const passed = testResults.filter((t) => t.passed).length;
  const failed = total - passed;
  console.log(`TOTAL TESTS: ${total} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log(`OVERALL HEALTH: ${failed === 0 ? "100% HEALTHY" : `${Math.round((passed / total) * 100)}% HEALTHY`}`);
  console.log("==================================================\n");

  return { total, passed, failed, results: testResults };
}

runTestSuite().then((summary) => {
  process.exit(summary.failed > 0 ? 1 : 0);
}).catch((err) => {
  console.error("FATAL TEST RUNNER ERROR:", err);
  process.exit(1);
});
