// scratch/test_api.mjs
const BASE_URL = 'http://localhost:5173/api';

const results = [];

function log(status, name, details = '') {
  results.push({ status, name, details });
  const icon = status === 'PASS' ? '✅' : '❌';
  console.log(`${icon} [${status}] ${name} ${details ? '(' + details + ')' : ''}`);
}

async function api(path, options = {}, token = null) {
  const headers = { ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (options.body && !(options.body instanceof FormData) && typeof options.body === 'object') {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const contentType = res.headers.get('content-type') || '';
  let data;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }
  return { status: res.status, ok: res.ok, data };
}

async function run() {
  console.log('--- STARTING COMPREHENSIVE API TEST ---');

  // 1. AUTH - Login Admin
  let adminToken = null;
  let adminUser = null;
  try {
    const otpRes = await api('/auth/login', { method: 'POST', body: { email: 'admin@abm.com' } });
    if (otpRes.ok && otpRes.data.otpSent) {
      log('PASS', 'Auth - Admin request OTP');
    } else {
      log('FAIL', 'Auth - Admin request OTP', JSON.stringify(otpRes.data));
    }

    const verifyRes = await api('/auth/verify-otp', {
      method: 'POST',
      body: { email: 'admin@abm.com', otp: '123456', mode: 'login' }
    });
    if (verifyRes.ok && verifyRes.data.token) {
      adminToken = verifyRes.data.token;
      adminUser = verifyRes.data.user;
      log('PASS', 'Auth - Admin verify OTP & get JWT');
    } else {
      log('FAIL', 'Auth - Admin verify OTP', JSON.stringify(verifyRes.data));
    }
  } catch (e) {
    log('FAIL', 'Auth - Admin Login Exception', e.message);
  }

  // 2. AUTH - Login Employee
  let empToken = null;
  let empUser = null;
  try {
    await api('/auth/login', { method: 'POST', body: { email: 'gaurav.gaikwad@abmindia.com' } });
    const verifyRes = await api('/auth/verify-otp', {
      method: 'POST',
      body: { email: 'gaurav.gaikwad@abmindia.com', otp: '123456', mode: 'login' }
    });
    if (verifyRes.ok && verifyRes.data.token) {
      empToken = verifyRes.data.token;
      empUser = verifyRes.data.user;
      log('PASS', 'Auth - Employee verify OTP & get JWT');
    } else {
      log('FAIL', 'Auth - Employee verify OTP', JSON.stringify(verifyRes.data));
    }
  } catch (e) {
    log('FAIL', 'Auth - Employee Login Exception', e.message);
  }

  // 3. AUTH - Inactive user rejection
  try {
    const res = await api('/auth/login', { method: 'POST', body: { email: 'karthik@abm.com' } });
    if (res.status === 403) {
      log('PASS', 'Auth - Inactive account rejected with 403');
    } else {
      log('FAIL', 'Auth - Inactive account check', `Status: ${res.status}`);
    }
  } catch (e) {
    log('FAIL', 'Auth - Inactive check exception', e.message);
  }

  // 4. AUTH - Invalid domain rejection
  try {
    const res = await api('/auth/login', { method: 'POST', body: { email: 'test@gmail.com' } });
    if (res.status === 400) {
      log('PASS', 'Auth - Non-ABM email rejected with 400');
    } else {
      log('FAIL', 'Auth - Non-ABM email check', `Status: ${res.status}`);
    }
  } catch (e) {
    log('FAIL', 'Auth - Non-ABM check exception', e.message);
  }

  // 5. BOOTSTRAP
  try {
    const res = await api('/bootstrap', {}, adminToken);
    if (res.ok && res.data.currentUser && Array.isArray(res.data.departments)) {
      log('PASS', 'Bootstrap - Full dataset loaded for admin');
    } else {
      log('FAIL', 'Bootstrap - Failed', JSON.stringify(res.data));
    }
  } catch (e) {
    log('FAIL', 'Bootstrap exception', e.message);
  }

  // 6. TAXONOMY - Departments
  let testDeptId = null;
  try {
    const createRes = await api('/departments', {
      method: 'POST',
      body: { name: `TestDept_${Date.now()}`, description: 'Test description' }
    }, adminToken);
    if (createRes.ok && (createRes.data.id || createRes.data.departmentId)) {
      testDeptId = createRes.data.id || createRes.data.departmentId;
      log('PASS', 'Taxonomy - Create Department', `ID: ${testDeptId}`);
    } else {
      log('FAIL', 'Taxonomy - Create Department', JSON.stringify(createRes.data));
    }

    if (testDeptId) {
      const updateRes = await api(`/departments/${testDeptId}`, {
        method: 'PUT',
        body: { name: `UpdatedDept_${Date.now()}`, description: 'Updated' }
      }, adminToken);
      if (updateRes.ok) {
        log('PASS', 'Taxonomy - Update Department');
      } else {
        log('FAIL', 'Taxonomy - Update Department', JSON.stringify(updateRes.data));
      }

      const delRes = await api(`/departments/${testDeptId}`, { method: 'DELETE' }, adminToken);
      if (delRes.ok) {
        log('PASS', 'Taxonomy - Delete Department');
      } else {
        log('FAIL', 'Taxonomy - Delete Department', JSON.stringify(delRes.data));
      }
    }
  } catch (e) {
    log('FAIL', 'Taxonomy - Department Exception', e.message);
  }

  // 7. TAXONOMY - Categories
  let testCatId = null;
  try {
    const createRes = await api('/categories', {
      method: 'POST',
      body: { name: `TestCat_${Date.now()}` }
    }, adminToken);
    if (createRes.ok && createRes.data.id) {
      testCatId = createRes.data.id;
      log('PASS', 'Taxonomy - Create Category', `ID: ${testCatId}`);
    } else {
      log('FAIL', 'Taxonomy - Create Category', JSON.stringify(createRes.data));
    }

    if (testCatId) {
      const updateRes = await api(`/categories/${testCatId}`, {
        method: 'PUT',
        body: { name: `UpdatedCat_${Date.now()}` }
      }, adminToken);
      if (updateRes.ok) {
        log('PASS', 'Taxonomy - Update Category');
      } else {
        log('FAIL', 'Taxonomy - Update Category', JSON.stringify(updateRes.data));
      }

      const delRes = await api(`/categories/${testCatId}`, { method: 'DELETE' }, adminToken);
      if (delRes.ok) {
        log('PASS', 'Taxonomy - Delete Category');
      } else {
        log('FAIL', 'Taxonomy - Delete Category', JSON.stringify(delRes.data));
      }
    }
  } catch (e) {
    log('FAIL', 'Taxonomy - Category Exception', e.message);
  }

  // 8. TAXONOMY - Tags
  let testTagId = null;
  try {
    const createRes = await api('/tags', {
      method: 'POST',
      body: { name: `testtag_${Date.now()}` }
    }, adminToken);
    if (createRes.ok && createRes.data.id) {
      testTagId = createRes.data.id;
      log('PASS', 'Taxonomy - Create Tag', `ID: ${testTagId}`);
    } else {
      log('FAIL', 'Taxonomy - Create Tag', JSON.stringify(createRes.data));
    }

    if (testTagId) {
      const delRes = await api(`/tags/${testTagId}`, { method: 'DELETE' }, adminToken);
      if (delRes.ok) {
        log('PASS', 'Taxonomy - Delete Tag');
      } else {
        log('FAIL', 'Taxonomy - Delete Tag', JSON.stringify(delRes.data));
      }
    }
  } catch (e) {
    log('FAIL', 'Taxonomy - Tag Exception', e.message);
  }

  // 9. TASKS WORKFLOW
  let testTaskId = null;
  try {
    // Employee creates task
    const createRes = await api('/tasks', {
      method: 'POST',
      body: {
        title: `[TEST] Task by Employee ${Date.now()}`,
        description: 'Testing task creation flow',
        departmentId: 2,
        priority: 'high',
        tags: 'test,automated'
      }
    }, empToken);

    if (createRes.ok && (createRes.data.id || createRes.data.taskId)) {
      testTaskId = createRes.data.id || createRes.data.taskId;
      log('PASS', 'Tasks - Employee create task', `ID: ${testTaskId}`);
    } else {
      log('FAIL', 'Tasks - Employee create task', JSON.stringify(createRes.data));
    }

    if (testTaskId) {
      // Get task
      const getRes = await api(`/tasks/${testTaskId}`, {}, empToken);
      if (getRes.ok && getRes.data.id === testTaskId) {
        log('PASS', 'Tasks - Get task by ID');
      } else {
        log('FAIL', 'Tasks - Get task by ID', JSON.stringify(getRes.data));
      }

      // Admin reviews task (approve)
      const reviewRes = await api(`/tasks/${testTaskId}/review`, {
        method: 'POST',
        body: { decision: 'approved', remarks: 'Looks great!' }
      }, adminToken);
      if (reviewRes.ok && reviewRes.data.status === 'approved') {
        log('PASS', 'Tasks - Admin approve task');
      } else {
        log('FAIL', 'Tasks - Admin approve task', JSON.stringify(reviewRes.data));
      }

      // Admin toggles recommend
      const recRes = await api(`/tasks/${testTaskId}/recommend`, {
        method: 'POST',
        body: { isRecommended: true }
      }, adminToken);
      if (recRes.ok) {
        log('PASS', 'Tasks - Admin recommend task');
      } else {
        log('FAIL', 'Tasks - Admin recommend task', JSON.stringify(recRes.data));
      }

      // Comment on task
      const commentRes = await api(`/tasks/${testTaskId}/comments`, {
        method: 'POST',
        body: { body: 'This is an automated test comment' }
      }, empToken);
      if (commentRes.ok && (commentRes.data.id || commentRes.data.commentId)) {
        log('PASS', 'Tasks - Comment on task');
      } else {
        log('FAIL', 'Tasks - Comment on task', JSON.stringify(commentRes.data));
      }

      // Get comments
      const getCommentsRes = await api(`/tasks/${testTaskId}/comments`, {}, empToken);
      if (getCommentsRes.ok && Array.isArray(getCommentsRes.data)) {
        log('PASS', 'Tasks - List task comments');
      } else {
        log('FAIL', 'Tasks - List task comments', JSON.stringify(getCommentsRes.data));
      }

      // Delete task (admin cleanup)
      const delRes = await api(`/tasks/${testTaskId}`, {
        method: 'DELETE',
        body: { reason: 'Automated test cleanup' }
      }, adminToken);
      if (delRes.ok) {
        log('PASS', 'Tasks - Delete task');
      } else {
        log('FAIL', 'Tasks - Delete task', JSON.stringify(delRes.data));
      }
    }
  } catch (e) {
    log('FAIL', 'Tasks Workflow Exception', e.message);
  }

  // 10. KNOWLEDGE POSTS WORKFLOW
  let testKnowledgeId = null;
  try {
    const createRes = await api('/knowledge', {
      method: 'POST',
      body: {
        title: `[TEST] Knowledge Post ${Date.now()}`,
        description: 'Comprehensive knowledge test article',
        departmentId: 2,
        tags: 'knowledge,test',
        contentType: 'text'
      }
    }, empToken);

    if (createRes.ok && (createRes.data.id || createRes.data.knowledgeId)) {
      testKnowledgeId = createRes.data.id || createRes.data.knowledgeId;
      log('PASS', 'Knowledge - Create knowledge post', `ID: ${testKnowledgeId}`);
    } else {
      log('FAIL', 'Knowledge - Create knowledge post', JSON.stringify(createRes.data));
    }

    if (testKnowledgeId) {
      // Review
      const revRes = await api(`/knowledge/${testKnowledgeId}/review`, {
        method: 'POST',
        body: { decision: 'approved', remarks: 'Good knowledge base' }
      }, adminToken);
      if (revRes.ok) {
        log('PASS', 'Knowledge - Admin approve knowledge post');
      } else {
        log('FAIL', 'Knowledge - Admin approve knowledge post', JSON.stringify(revRes.data));
      }

      // Recommend
      const recRes = await api(`/knowledge/${testKnowledgeId}/recommend`, {
        method: 'POST',
        body: { isRecommended: true }
      }, adminToken);
      if (recRes.ok) {
        log('PASS', 'Knowledge - Admin recommend knowledge post');
      } else {
        log('FAIL', 'Knowledge - Admin recommend knowledge post', JSON.stringify(recRes.data));
      }

      // Comment
      const commentRes = await api(`/knowledge/${testKnowledgeId}/comments`, {
        method: 'POST',
        body: { body: 'Great knowledge post!' }
      }, empToken);
      if (commentRes.ok) {
        log('PASS', 'Knowledge - Comment on knowledge post');
      } else {
        log('FAIL', 'Knowledge - Comment on knowledge post', JSON.stringify(commentRes.data));
      }

      // Delete
      const delRes = await api(`/knowledge/${testKnowledgeId}`, {
        method: 'DELETE',
        body: { reason: 'Test cleanup' }
      }, adminToken);
      if (delRes.ok) {
        log('PASS', 'Knowledge - Delete knowledge post');
      } else {
        log('FAIL', 'Knowledge - Delete knowledge post', JSON.stringify(delRes.data));
      }
    }
  } catch (e) {
    log('FAIL', 'Knowledge Workflow Exception', e.message);
  }

  // 11. VIDEOS WORKFLOW
  let testVideoId = null;
  try {
    // Create video via POST (x-www-form-urlencoded or multipart or json)
    // Note: VideoController uses $_POST
    const formData = new URLSearchParams();
    formData.append('title', `[TEST] Video Submission ${Date.now()}`);
    formData.append('description', 'Test video description');
    formData.append('departmentId', '2');
    formData.append('tags', 'video,tutorial');

    const res = await fetch(`${BASE_URL}/videos`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${empToken}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    });
    const videoData = await res.json();
    if (res.ok && videoData.id) {
      testVideoId = videoData.id;
      log('PASS', 'Videos - Create video', `ID: ${testVideoId}`);
    } else {
      log('FAIL', 'Videos - Create video', JSON.stringify(videoData));
    }

    if (testVideoId) {
      // Review
      const revRes = await api(`/videos/${testVideoId}/review`, {
        method: 'POST',
        body: { decision: 'approved', remarks: 'Good video' }
      }, adminToken);
      if (revRes.ok) {
        log('PASS', 'Videos - Admin approve video');
      } else {
        log('FAIL', 'Videos - Admin approve video', JSON.stringify(revRes.data));
      }

      // View count increment
      const viewRes = await api(`/videos/${testVideoId}/view`, { method: 'POST' }, empToken);
      if (viewRes.ok) {
        log('PASS', 'Videos - Increment view count');
      } else {
        log('FAIL', 'Videos - Increment view count', JSON.stringify(viewRes.data));
      }

      // Recommend video
      const recRes = await api(`/videos/${testVideoId}/recommend`, {
        method: 'POST',
        body: { isRecommended: true }
      }, adminToken);
      if (recRes.ok) {
        log('PASS', 'Videos - Admin recommend video');
      } else {
        log('FAIL', 'Videos - Admin recommend video', JSON.stringify(recRes.data));
      }

      // Comment on video
      const commRes = await api(`/videos/${testVideoId}/comments`, {
        method: 'POST',
        body: { body: 'Very helpful video!' }
      }, empToken);
      if (commRes.ok) {
        log('PASS', 'Videos - Comment on video');
      } else {
        log('FAIL', 'Videos - Comment on video', JSON.stringify(commRes.data));
      }

      // Delete video
      const delRes = await api(`/videos/${testVideoId}`, {
        method: 'DELETE',
        body: { reason: 'Test cleanup' }
      }, adminToken);
      if (delRes.ok) {
        log('PASS', 'Videos - Delete video');
      } else {
        log('FAIL', 'Videos - Delete video', JSON.stringify(delRes.data));
      }
    }
  } catch (e) {
    log('FAIL', 'Videos Workflow Exception', e.message);
  }

  // 12. BOOKMARKS WORKFLOW
  try {
    const addRes = await api('/bookmarks', {
      method: 'POST',
      body: { contentType: 'task', contentId: 1 }
    }, empToken);
    if (addRes.ok) {
      log('PASS', 'Bookmarks - Add bookmark');
    } else {
      log('FAIL', 'Bookmarks - Add bookmark', JSON.stringify(addRes.data));
    }

    const listRes = await api('/bookmarks', {}, empToken);
    if (listRes.ok && Array.isArray(listRes.data)) {
      log('PASS', 'Bookmarks - List user bookmarks');
    } else {
      log('FAIL', 'Bookmarks - List bookmarks', JSON.stringify(listRes.data));
    }

    const delRes = await api('/bookmarks', {
      method: 'DELETE',
      body: { contentType: 'task', contentId: 1 }
    }, empToken);
    if (delRes.ok) {
      log('PASS', 'Bookmarks - Remove bookmark');
    } else {
      log('FAIL', 'Bookmarks - Remove bookmark', JSON.stringify(delRes.data));
    }
  } catch (e) {
    log('FAIL', 'Bookmarks Exception', e.message);
  }

  // 13. RECOMMENDED LIST
  try {
    const res = await api('/recommended', {}, empToken);
    if (res.ok && Array.isArray(res.data)) {
      log('PASS', 'Recommended - Fetch recommended feed');
    } else {
      log('FAIL', 'Recommended - Fetch feed', JSON.stringify(res.data));
    }
  } catch (e) {
    log('FAIL', 'Recommended Exception', e.message);
  }

  // 14. NOTIFICATIONS
  try {
    const listRes = await api('/notifications', {}, empToken);
    if (listRes.ok && Array.isArray(listRes.data)) {
      log('PASS', 'Notifications - Fetch notifications');
    } else {
      log('FAIL', 'Notifications - Fetch notifications', JSON.stringify(listRes.data));
    }

    const readAllRes = await api('/notifications/read-all', { method: 'POST' }, empToken);
    if (readAllRes.ok) {
      log('PASS', 'Notifications - Mark all as read');
    } else {
      log('FAIL', 'Notifications - Mark all as read', JSON.stringify(readAllRes.data));
    }
  } catch (e) {
    log('FAIL', 'Notifications Exception', e.message);
  }

  // 15. SITE SETTINGS
  try {
    const getRes = await api('/site-settings', {}, adminToken);
    if (getRes.ok) {
      log('PASS', 'Site Settings - Get settings');
    } else {
      log('FAIL', 'Site Settings - Get settings', JSON.stringify(getRes.data));
    }

    const updateRes = await api('/site-settings', {
      method: 'POST',
      body: { portalName: 'TaskIQ Portal' }
    }, adminToken);
    if (updateRes.ok) {
      log('PASS', 'Site Settings - Update settings');
    } else {
      log('FAIL', 'Site Settings - Update settings', JSON.stringify(updateRes.data));
    }
  } catch (e) {
    log('FAIL', 'Site Settings Exception', e.message);
  }

  // 16. ADMIN MANAGEMENT & ANALYTICS
  try {
    const usersRes = await api('/admin/users', {}, adminToken);
    if (usersRes.ok && Array.isArray(usersRes.data)) {
      log('PASS', 'Admin - List users');
    } else {
      log('FAIL', 'Admin - List users', JSON.stringify(usersRes.data));
    }

    const rolesRes = await api('/admin/roles', {}, adminToken);
    if (rolesRes.ok && Array.isArray(rolesRes.data)) {
      log('PASS', 'Admin - List roles');
    } else {
      log('FAIL', 'Admin - List roles', JSON.stringify(rolesRes.data));
    }

    const permsRes = await api('/admin/permissions', {}, adminToken);
    if (permsRes.ok && Array.isArray(permsRes.data)) {
      log('PASS', 'Admin - List permissions');
    } else {
      log('FAIL', 'Admin - List permissions', JSON.stringify(permsRes.data));
    }

    const analyticsRes = await api('/admin/analytics', {}, adminToken);
    if (analyticsRes.ok) {
      log('PASS', 'Admin - Analytics');
    } else {
      log('FAIL', 'Admin - Analytics', JSON.stringify(analyticsRes.data));
    }

    const activityRes = await api('/admin/activity/recent', {}, adminToken);
    if (activityRes.ok && Array.isArray(activityRes.data)) {
      log('PASS', 'Admin - Recent Activity');
    } else {
      log('FAIL', 'Admin - Recent Activity', JSON.stringify(activityRes.data));
    }
  } catch (e) {
    log('FAIL', 'Admin Management Exception', e.message);
  }

  console.log('\n--- SUMMARY ---');
  const passes = results.filter(r => r.status === 'PASS').length;
  const fails = results.filter(r => r.status === 'FAIL').length;
  console.log(`Total: ${results.length} | Passed: ${passes} | Failed: ${fails}`);
  if (fails > 0) {
    console.log('\nFailed Tests:');
    results.filter(r => r.status === 'FAIL').forEach(f => console.log(`- ${f.name}: ${f.details}`));
  }
}

run();
