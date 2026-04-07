// ═══════════════════════════════════════════════════════════════
// TLLC Tracker — Google Apps Script
// Handles: roadmap progress logging, progress restore, intake form
// Sheet tabs required: "RoadmapLog" and "Intake"
// ═══════════════════════════════════════════════════════════════

function doGet(e) {
  var action = (e.parameter.action || '').toLowerCase();

  if (action === 'get') {
    return restoreProgress(e);
  }

  if (action === 'dashboard') {
    return getDashboard();
  }

  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', message: 'TLLC Tracker is running' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = (data.action || '').toLowerCase();

    if (action === 'log') {
      return logProgress(data);
    }

    if (action === 'intake') {
      return saveIntake(data);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: 'Unknown action: ' + action }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── ROADMAP PROGRESS LOG ──────────────────────────────────────
function logProgress(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('RoadmapLog');

  if (!sheet) {
    sheet = ss.insertSheet('RoadmapLog');
    sheet.appendRow([
      'Timestamp', 'Instagram', 'Name', 'Step ID', 'Step Text',
      'Checked', 'Path', 'Completed Steps', 'Total Completed'
    ]);
  }

  var completedSteps = data.completedSteps || [];

  sheet.appendRow([
    data.timestamp || new Date().toISOString(),
    data.instagram || '',
    data.name || '',
    data.stepId || '',
    data.stepText || '',
    data.checked ? 'TRUE' : 'FALSE',
    data.path || '',
    completedSteps.join(', '),
    completedSteps.length
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── RESTORE PROGRESS ──────────────────────────────────────────
function restoreProgress(e) {
  var instagram = (e.parameter.instagram || '').toLowerCase().trim();

  if (!instagram) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: 'No instagram provided' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('RoadmapLog');

  if (!sheet) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok', steps: [], path: 'new' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var data = sheet.getDataRange().getValues();
  var latestSteps = [];
  var latestPath = 'new';

  // Walk rows newest-first to find the user's most recent entry with completed steps
  for (var i = data.length - 1; i >= 1; i--) {
    var rowIg = (data[i][1] || '').toString().toLowerCase().trim();
    if (rowIg === instagram && data[i][7]) {
      var stepsStr = data[i][7].toString().trim();
      if (stepsStr.length > 0) {
        latestSteps = stepsStr.split(',').map(function(s) { return s.trim(); }).filter(function(s) { return s.length > 0; });
        latestPath = (data[i][6] || 'new').toString();
        break;
      }
    }
  }

  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', steps: latestSteps, path: latestPath }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── DASHBOARD (ALL MEMBERS) ───────────────────────────────────
function getDashboard() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('RoadmapLog');

  if (!sheet) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok', members: [] }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var data = sheet.getDataRange().getValues();
  var seen = {};
  var members = [];

  // Walk newest-first, capture first (most recent) row per Instagram handle
  for (var i = data.length - 1; i >= 1; i--) {
    var ig = (data[i][1] || '').toString().toLowerCase().trim();
    if (!ig || seen[ig]) continue;
    seen[ig] = true;

    var stepsStr = (data[i][7] || '').toString().trim();
    var steps = [];
    if (stepsStr.length > 0) {
      steps = stepsStr.split(',').map(function(s) { return s.trim(); }).filter(function(s) { return s.length > 0; });
    }

    members.push({
      name: (data[i][2] || '').toString(),
      instagram: ig,
      path: (data[i][6] || 'new').toString(),
      completedSteps: steps,
      totalCompleted: steps.length,
      lastActivity: (data[i][0] || '').toString()
    });
  }

  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', members: members }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── INTAKE FORM ───────────────────────────────────────────────
function saveIntake(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Intake');

  if (!sheet) {
    sheet = ss.insertSheet('Intake');
    sheet.appendRow([
      'Timestamp', 'Name', 'Instagram', 'Licensed', 'Deals Closed',
      'Team Status', 'Posted Video', 'Struggles', 'Why Joined',
      'Success 90 Days', 'Stop Doing', 'Referral Source'
    ]);
  }

  var struggles = data.struggles || [];

  sheet.appendRow([
    new Date().toISOString(),
    data.name || '',
    data.instagram || '',
    data.licensed || '',
    data.deals_closed || '',
    data.team_status || '',
    data.posted_video || '',
    Array.isArray(struggles) ? struggles.join(', ') : struggles,
    data.why_joined || '',
    data.success_90 || '',
    data.stop_doing || '',
    data.referral_source || ''
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}
