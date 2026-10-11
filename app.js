(() => {
  'use strict';

  const STORAGE_KEY = 'shespeaks_portal_cases_v5';
  const FEEDBACK_KEY = 'shespeaks_feedback_v1';
  const FACULTY_SESSION_KEY = 'shespeaks_faculty_session';
  const STUDENT_SESSION_KEY = 'shespeaks_student_session';

  const STUDENT_EMAIL = 'sajid@gmail.com';
  const STUDENT_PASSWORD = 'sajid123';

  const FACULTY_EMAIL = 'principal@gmail.com';
  const FACULTY_PASSWORD = 'principal123';

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const $$ = (selector, root = document) =>
    Array.from(root.querySelectorAll(selector));

  const now = () => new Date().toISOString();

  let currentStudentCode = '';
  let selectedMessageCode = '';
  let toastTimer;

  /* STARTING CASES */

  const seedCases = [
    {
      code: 'SS-26-A7K2M9',
      category: 'Cyber harassment',
      incidentDate: '2026-10-08',
      place: 'Class group chat',
      details:
        'Repeated unwanted messages continued after the student asked for them to stop.',
      support: 'I would like guidance',
      status: 'New',
      createdAt: '2026-10-09T09:20:00.000Z',
      updatedAt: '2026-10-09T09:20:00.000Z',
      unread: true,
      messages: [
        {
          from: 'system',
          text: 'Concern received. A faculty reviewer will check it.',
          time: '2026-10-09T09:20:00.000Z'
        },
        {
          from: 'student',
          text: 'Please let me know what next step I should take.',
          time: '2026-10-09T09:24:00.000Z'
        }
      ]
    },
    {
      code: 'SS-26-B4Q8X1',
      category: 'Unwanted contact',
      incidentDate: '2026-10-07',
      place: 'Outside science laboratory',
      details:
        'A student reports being repeatedly stopped outside the laboratory and feeling uncomfortable.',
      support: 'Please review this concern',
      status: 'Under Review',
      createdAt: '2026-10-08T06:45:00.000Z',
      updatedAt: '2026-10-10T10:10:00.000Z',
      unread: false,
      messages: [
        {
          from: 'system',
          text: 'Concern received. A faculty reviewer will check it.',
          time: '2026-10-08T06:45:00.000Z'
        },
        {
          from: 'staff',
          text:
            'This case is now under review. Is there any additional information you would like to add?',
          time: '2026-10-10T10:10:00.000Z'
        }
      ]
    },
    {
      code: 'SS-26-C9R2L6',
      category: 'Bullying or intimidation',
      incidentDate: '2026-10-03',
      place: 'Classroom',
      details:
        'Repeated classroom intimidation was reported by a student.',
      support: 'Please review this concern',
      status: 'Resolved',
      createdAt: '2026-10-04T07:15:00.000Z',
      updatedAt: '2026-10-07T12:30:00.000Z',
      unread: false,
      messages: [
        {
          from: 'system',
          text: 'Concern received. A faculty reviewer will check it.',
          time: '2026-10-04T07:15:00.000Z'
        },
        {
          from: 'staff',
          text: 'A support meeting was recorded for this concern.',
          time: '2026-10-06T10:00:00.000Z'
        },
        {
          from: 'system',
          text: 'Case status changed to Resolved.',
          time: '2026-10-07T12:30:00.000Z'
        }
      ]
    }
  ];

  /* STORAGE FUNCTIONS */

  function cloneSeedCases() {
    return JSON.parse(JSON.stringify(seedCases));
  }

  function loadCases() {
    try {
      const savedCases = JSON.parse(
        localStorage.getItem(STORAGE_KEY)
      );

      if (Array.isArray(savedCases) && savedCases.length) {
        return savedCases;
      }
    } catch (error) {
      console.warn('Could not load saved cases.', error);
    }

    const initialCases = cloneSeedCases();
    saveCases(initialCases);

    return initialCases;
  }

  function saveCases(cases) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(cases)
    );
  }

  function getCase(caseCode) {
    const enteredCode = String(caseCode)
      .trim()
      .toUpperCase();

    return loadCases().find(
      item => item.code.toUpperCase() === enteredCode
    );
  }

  function updateCase(caseCode, updater) {
    const cases = loadCases();

    const caseIndex = cases.findIndex(
      item => item.code === caseCode
    );

    if (caseIndex < 0) {
      return null;
    }

    cases[caseIndex] = updater({
      ...cases[caseIndex]
    });

    saveCases(cases);

    return cases[caseIndex];
  }

  /* HELPER FUNCTIONS */

  function escapeHTML(value) {
    return String(value ?? '').replace(
      /[&<>'"]/g,
      character =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          "'": '&#39;',
          '"': '&quot;'
        })[character]
    );
  }

  function formatDate(value, includeTime = false) {
    if (!value) {
      return 'Not provided';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    const options = includeTime
      ? {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        }
      : {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        };

    return new Intl.DateTimeFormat(
      'en-IN',
      options
    ).format(date);
  }

  function getStatusClass(status) {
    if (status === 'Resolved') {
      return 'resolved';
    }

    if (status === 'Under Review') {
      return 'review';
    }

    return 'new';
  }

  function showToast(message) {
    const toastElement = $('#toast');

    toastElement.textContent = message;
    toastElement.classList.add('show');

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
      toastElement.classList.remove('show');
    }, 2400);
  }

  /* PAGE ROUTING */

  function route(pageName) {
    const facultySignedIn =
      sessionStorage.getItem(FACULTY_SESSION_KEY) === 'true';

    const studentSignedIn =
      sessionStorage.getItem(STUDENT_SESSION_KEY) === 'true';

    if (pageName === 'student' && !studentSignedIn) {
      pageName = 'login';
    }

    if (pageName === 'admin' && !facultySignedIn) {
      pageName = 'login';
    }

    if (pageName === 'admin-login') {
      pageName = facultySignedIn ? 'admin' : 'login';
    }

    if (
      pageName === 'home' &&
      !studentSignedIn &&
      !facultySignedIn
    ) {
      pageName = 'login';
    }

    $$('.view').forEach(view => {
      view.classList.remove('is-active');
    });

    const selectedView =
      $(`#view-${pageName}`) || $('#view-home');

    selectedView.classList.add('is-active');

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });

    if (pageName === 'student') {
      showStudentPanel('studentStart');
    }

    if (pageName === 'admin') {
      renderFacultyDashboard();
    }

    const routeHash =
      pageName === 'home'
        ? '#home'
        : `#${pageName}`;

    history.replaceState(
      null,
      '',
      routeHash
    );
  }

  /* STUDENT PANELS */

  function showStudentPanel(panelId) {
    $$('#view-student .student-workspace > div')
      .forEach(panel => {
        panel.classList.add('is-hidden');
      });

    const selectedPanel = $(`#${panelId}`);

    if (selectedPanel) {
      selectedPanel.classList.remove('is-hidden');
    }

    const portalBanner = $('.portal-banner');

    if (portalBanner) {
      window.scrollTo({
        top: portalBanner.offsetTop,
        behavior: 'smooth'
      });
    }
  }

  function generateCaseCode() {
    const characters =
      'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    const randomBytes = new Uint8Array(6);

    if (
      window.crypto &&
      window.crypto.getRandomValues
    ) {
      window.crypto.getRandomValues(randomBytes);
    } else {
      for (
        let index = 0;
        index < randomBytes.length;
        index += 1
      ) {
        randomBytes[index] =
          Math.floor(Math.random() * 256);
      }
    }

    const randomPart = Array.from(
      randomBytes,
      byte =>
        characters[
          byte % characters.length
        ]
    ).join('');

    return `SS-26-${randomPart}`;
  }

  /* SUBMIT NEW CONCERN */

  function submitConcern(event) {
    event.preventDefault();

    const category = $('#category').value;
    const details = $('#details').value.trim();
    const confirmed =
      $('#reviewConfirm').checked;

    $$('[data-error]').forEach(element => {
      element.textContent = '';
    });

    let formIsValid = true;

    if (!category) {
      $('[data-error="category"]').textContent =
        'Choose a concern category.';

      formIsValid = false;
    }

    if (details.length < 20) {
      $('[data-error="details"]').textContent =
        'Please enter at least 20 characters.';

      formIsValid = false;
    }

    if (!confirmed) {
      $('[data-error="reviewConfirm"]').textContent =
        'Please confirm that you reviewed the information.';

      formIsValid = false;
    }

    if (!formIsValid) {
      return;
    }

    let caseCode = generateCaseCode();

    while (getCase(caseCode)) {
      caseCode = generateCaseCode();
    }

    const createdAt = now();

    const selectedSupport =
      $('input[name="support"]:checked');

    const concern = {
      code: caseCode,
      category,
      incidentDate: $('#incidentDate').value,
      place:
        $('#place').value.trim() ||
        'Not provided',
      details,
      support: selectedSupport
        ? selectedSupport.value
        : 'Please review this concern',
      status: 'New',
      createdAt,
      updatedAt: createdAt,
      unread: true,
      messages: [
        {
          from: 'system',
          text:
            'Concern received. A faculty reviewer will check it.',
          time: createdAt
        }
      ]
    };

    const cases = loadCases();

    cases.unshift(concern);
    saveCases(cases);

    currentStudentCode = caseCode;

    $('#newCaseCode').textContent =
      caseCode;

    $('#concernForm').reset();

    $('#detailsCount').textContent =
      '0 / 800';

    showStudentPanel('successPanel');
  }

  /* OPEN STUDENT CASE */

  function openStudentCase(caseCode) {
    const concern = getCase(caseCode);

    if (!concern) {
      return false;
    }

    currentStudentCode = concern.code;

    $('#studentCaseCode').textContent =
      concern.code;

    $('#studentCaseMeta').textContent =
      `${concern.category} • Submitted ${formatDate(concern.createdAt)}`;

    $('#studentCaseUpdated').textContent =
      formatDate(concern.updatedAt, true);

    const statusBadge =
      $('#studentStatusBadge');

    statusBadge.textContent =
      concern.status;

    statusBadge.className =
      `status-badge ${getStatusClass(concern.status)}`;

    renderTimeline(concern);

    $('#studentCaseDetails').innerHTML = `
      <div>
        <dt>Category</dt>
        <dd>${escapeHTML(concern.category)}</dd>
      </div>

      <div>
        <dt>Approximate date</dt>
        <dd>${escapeHTML(formatDate(concern.incidentDate))}</dd>
      </div>

      <div>
        <dt>Location / context</dt>
        <dd>${escapeHTML(concern.place)}</dd>
      </div>

      <div>
        <dt>Preferred next step</dt>
        <dd>${escapeHTML(concern.support)}</dd>
      </div>

      <div class="wide">
        <dt>Concern description</dt>
        <dd>${escapeHTML(concern.details)}</dd>
      </div>
    `;

    renderMessages(
      $('#studentMessages'),
      concern.messages
    );

    showStudentPanel('casePanel');

    return true;
  }

  function renderTimeline(concern) {
    let completedLevels = 1;

    if (concern.status === 'Under Review') {
      completedLevels = 2;
    }

    if (concern.status === 'Resolved') {
      completedLevels = 3;
    }

    const timelineItems = [
      [
        'Received',
        formatDate(concern.createdAt)
      ],
      [
        'Under review',
        completedLevels >= 2
          ? 'Faculty review started'
          : 'Waiting for review'
      ],
      [
        'Resolved',
        completedLevels >= 3
          ? formatDate(concern.updatedAt)
          : 'Pending'
      ]
    ];

    $('#statusTimeline').innerHTML =
      timelineItems
        .map((item, index) => {
          const completed =
            index < completedLevels;

          return `
            <div class="timeline-step ${completed ? 'done' : ''}">
              <span class="timeline-dot">
                ${completed ? '✓' : index + 1}
              </span>

              <b>${item[0]}</b>
              <small>${escapeHTML(item[1])}</small>
            </div>
          `;
        })
        .join('');
  }

  /* CHAT FUNCTIONS */

  function renderMessages(
    container,
    messages
  ) {
    container.innerHTML = messages
      .map(message => {
        let senderName = 'System';

        if (message.from === 'staff') {
          senderName = 'Faculty reviewer';
        }

        if (message.from === 'student') {
          senderName = 'Student';
        }

        return `
          <div class="message ${escapeHTML(message.from)}">
            <div class="message-bubble">
              ${escapeHTML(message.text)}
            </div>

            <small>
              ${senderName} • ${escapeHTML(formatDate(message.time, true))}
            </small>
          </div>
        `;
      })
      .join('');

    requestAnimationFrame(() => {
      container.scrollTop =
        container.scrollHeight;
    });
  }

  function addMessage(
    caseCode,
    sender,
    messageText
  ) {
    const cleanMessage =
      messageText.trim();

    if (!cleanMessage) {
      return null;
    }

    return updateCase(
      caseCode,
      concern => {
        concern.messages = [
          ...concern.messages,
          {
            from: sender,
            text: cleanMessage,
            time: now()
          }
        ];

        concern.updatedAt = now();

        concern.unread =
          sender === 'student';

        return concern;
      }
    );
  }

  /* LOGIN FUNCTIONS */

  function studentLogin(event) {
    event.preventDefault();

    const enteredEmail =
      $('#studentEmail')
        .value
        .trim()
        .toLowerCase();

    const enteredPassword =
      $('#studentPassword').value;

    if (
      enteredEmail !== STUDENT_EMAIL ||
      enteredPassword !== STUDENT_PASSWORD
    ) {
      $('#studentLoginError').textContent =
        'Student email or password is incorrect.';

      return;
    }

    $('#studentLoginError').textContent = '';

    sessionStorage.setItem(
      STUDENT_SESSION_KEY,
      'true'
    );

    sessionStorage.removeItem(
      FACULTY_SESSION_KEY
    );

    route('student');

    showToast(
      'Welcome to the student portal'
    );
  }

  function facultyLogin(event) {
    event.preventDefault();

    const enteredEmail =
      $('#facultyEmail')
        .value
        .trim()
        .toLowerCase();

    const enteredPassword =
      $('#facultyPassword').value;

    if (
      enteredEmail !== FACULTY_EMAIL ||
      enteredPassword !== FACULTY_PASSWORD
    ) {
      $('#facultyLoginError').textContent =
        'Faculty email or password is incorrect.';

      return;
    }

    $('#facultyLoginError').textContent = '';

    sessionStorage.setItem(
      FACULTY_SESSION_KEY,
      'true'
    );

    sessionStorage.removeItem(
      STUDENT_SESSION_KEY
    );

    route('admin');

    showToast(
      'Welcome to the faculty dashboard'
    );
  }

  function togglePassword(
    inputSelector,
    button
  ) {
    const passwordInput =
      $(inputSelector);

    passwordInput.type =
      passwordInput.type === 'password'
        ? 'text'
        : 'password';

    button.textContent =
      passwordInput.type === 'password'
        ? 'Show'
        : 'Hide';
  }

  /* FACULTY DASHBOARD */

  function renderFacultyDashboard() {
    const cases = loadCases();

    const openCases = cases.filter(
      item => item.status !== 'Resolved'
    );

    const resolvedCases = cases.filter(
      item => item.status === 'Resolved'
    );

    const underReviewCases = cases.filter(
      item => item.status === 'Under Review'
    );

    const unreadCases = cases.filter(
      item => item.unread
    );

    $('#openNavCount').textContent =
      openCases.length;

    $('#messageNavCount').textContent =
      unreadCases.length;

    const dashboardMetrics = [
      [
        'Open concerns',
        openCases.length,
        'Awaiting or under review',
        'var(--gold)'
      ],
      [
        'Under review',
        underReviewCases.length,
        'Active faculty review',
        'var(--purple)'
      ],
      [
        'Unread messages',
        unreadCases.length,
        'Student follow-ups',
        'var(--coral)'
      ],
      [
        'Resolved',
        resolvedCases.length,
        'Completed cases',
        'var(--green)'
      ]
    ];

    $('#metricGrid').innerHTML =
      dashboardMetrics
        .map(metric => `
          <article
            class="metric-card"
            style="--metric:${metric[3]}"
          >
            <span>${metric[0]}</span>
            <b>${metric[1]}</b>
            <small>${metric[2]}</small>
          </article>
        `)
        .join('');

    renderCaseList(
      $('#recentCases'),
      cases.slice(0, 4)
    );

    $('#attentionList').innerHTML =
      unreadCases.length
        ? unreadCases
            .map(item => `
              <button
                class="attention-item"
                type="button"
                data-open-case="${escapeHTML(item.code)}"
              >
                <span>!</span>

                <span>
                  <b>${escapeHTML(item.code)}</b>
                  <small>
                    ${escapeHTML(item.category)}
                    • unread student message
                  </small>
                </span>
              </button>
            `)
            .join('')
        : '<div class="empty-list">No unread messages.</div>';

    renderOpenCases();

    renderCaseList(
      $('#resolvedCasesList'),
      resolvedCases
    );

    renderMessageCases(cases);
  }

  function renderCaseList(
    container,
    cases
  ) {
    if (!cases.length) {
      container.innerHTML =
        '<div class="empty-list">No cases in this queue.</div>';

      return;
    }

    container.innerHTML = cases
      .map(item => `
        <button
          class="case-row"
          type="button"
          data-open-case="${escapeHTML(item.code)}"
        >
          <span class="case-cell">
            <small>Case code</small>
            <b class="case-code">
              ${escapeHTML(item.code)}
            </b>
          </span>

          <span class="case-cell">
            <small>Category</small>
            <b>${escapeHTML(item.category)}</b>
          </span>

          <span class="case-cell case-date-cell">
            <small>Submitted</small>
            <b>${escapeHTML(formatDate(item.createdAt))}</b>
          </span>

          <span class="case-cell case-status-cell">
            <small>Status</small>

            <span class="status-badge ${getStatusClass(item.status)}">
              ${escapeHTML(item.status)}
            </span>
          </span>

          <span class="case-arrow">›</span>
        </button>
      `)
      .join('');
  }

  function renderOpenCases() {
    const searchText =
      ($('#caseSearch')?.value || '')
        .trim()
        .toLowerCase();

    const selectedStatus =
      $('#statusFilter')?.value || 'all';

    const cases = loadCases()
      .filter(
        item =>
          item.status !== 'Resolved'
      )
      .filter(
        item =>
          selectedStatus === 'all' ||
          item.status === selectedStatus
      )
      .filter(
        item =>
          !searchText ||
          item.code
            .toLowerCase()
            .includes(searchText) ||
          item.category
            .toLowerCase()
            .includes(searchText)
      );

    renderCaseList(
      $('#openCasesList'),
      cases
    );
  }

  function switchAdminSection(sectionName) {
    $$('.admin-section').forEach(section => {
      section.classList.remove('is-active');
    });

    const selectedSection =
      $(`#admin-${sectionName}`);

    if (!selectedSection) {
      return;
    }

    selectedSection.classList.add(
      'is-active'
    );

    $$('.admin-nav button').forEach(button => {
      button.classList.toggle(
        'active',
        button.dataset.adminSection ===
          sectionName
      );
    });

    const sectionLabels = {
      overview: 'Overview',
      open: 'Open concerns',
      resolved: 'Resolved',
      messages: 'Messages'
    };

    $('#adminBreadcrumb').textContent =
      `Dashboard / ${sectionLabels[sectionName]}`;

    if (sectionName === 'open') {
      renderOpenCases();
    }

    if (sectionName === 'resolved') {
      renderCaseList(
        $('#resolvedCasesList'),
        loadCases().filter(
          item => item.status === 'Resolved'
        )
      );
    }

    if (sectionName === 'messages') {
      renderMessageCases(loadCases());
    }
  }

  /* FACULTY CASE DRAWER */

  function openCaseDrawer(caseCode) {
    const concern = getCase(caseCode);

    if (!concern) {
      return;
    }

    if (concern.unread) {
      updateCase(
        caseCode,
        item => ({
          ...item,
          unread: false
        })
      );
    }

    $('#drawerCode').textContent =
      concern.code;

    $('#drawerBody').innerHTML = `
      <span class="status-badge ${getStatusClass(concern.status)}">
        ${escapeHTML(concern.status)}
      </span>

      <div class="drawer-summary">
        <div>
          <small>Category</small>
          <b>${escapeHTML(concern.category)}</b>
        </div>

        <div>
          <small>Submitted</small>
          <b>${escapeHTML(formatDate(concern.createdAt, true))}</b>
        </div>

        <div>
          <small>Date of incident</small>
          <b>${escapeHTML(formatDate(concern.incidentDate))}</b>
        </div>

        <div>
          <small>Location / context</small>
          <b>${escapeHTML(concern.place)}</b>
        </div>

        <div class="wide">
          <small>Concern</small>
          <p>${escapeHTML(concern.details)}</p>
        </div>

        <div class="wide">
          <small>Requested next step</small>
          <p>${escapeHTML(concern.support)}</p>
        </div>
      </div>

      <div class="drawer-section">
        <h3>Update case status</h3>

        <div class="status-actions">
          ${[
            'New',
            'Under Review',
            'Resolved'
          ]
            .map(status => `
              <button
                type="button"
                class="${status === concern.status ? 'active' : ''}"
                data-set-status="${status}"
                data-code="${escapeHTML(concern.code)}"
              >
                ${status}
              </button>
            `)
            .join('')}
        </div>
      </div>

      <div class="drawer-section">
        <h3>Private case chat</h3>

        <div class="drawer-chat">
          <div
            class="messages"
            id="drawerMessages"
          ></div>

          <form
            class="chat-form"
            id="drawerChatForm"
            data-code="${escapeHTML(concern.code)}"
          >
            <label
              class="sr-only"
              for="drawerChatInput"
            >
              Reply
            </label>

            <input
              id="drawerChatInput"
              maxlength="300"
              placeholder="Write a faculty reply..."
            />

            <button
              type="submit"
              aria-label="Send reply"
            >
              ↑
            </button>
          </form>
        </div>
      </div>
    `;

    renderMessages(
      $('#drawerMessages'),
      concern.messages
    );

    $('#drawerBackdrop').hidden = false;

    $('#caseDrawer').classList.add(
      'open'
    );

    $('#caseDrawer').setAttribute(
      'aria-hidden',
      'false'
    );

    renderFacultyDashboard();
  }

  function closeCaseDrawer() {
    $('#caseDrawer').classList.remove(
      'open'
    );

    $('#caseDrawer').setAttribute(
      'aria-hidden',
      'true'
    );

    $('#drawerBackdrop').hidden = true;
  }

  function setCaseStatus(
    caseCode,
    newStatus
  ) {
    const updatedCase = updateCase(
      caseCode,
      concern => {
        if (concern.status !== newStatus) {
          concern.messages = [
            ...concern.messages,
            {
              from: 'system',
              text:
                `Case status changed to ${newStatus}.`,
              time: now()
            }
          ];
        }

        concern.status = newStatus;
        concern.updatedAt = now();

        return concern;
      }
    );

    if (!updatedCase) {
      return;
    }

    showToast(
      `Case updated to ${newStatus}`
    );

    openCaseDrawer(caseCode);
  }

  /* FACULTY MESSAGE INBOX */

  function renderMessageCases(cases) {
    $('#messageCaseList').innerHTML =
      cases
        .map(item => {
          const lastMessage =
            item.messages[
              item.messages.length - 1
            ];

          return `
            <button
              class="message-case ${
                selectedMessageCode === item.code
                  ? 'active'
                  : ''
              }"
              type="button"
              data-message-case="${escapeHTML(item.code)}"
            >
              <span>
                ${item.unread ? '!' : 'SS'}
              </span>

              <div>
                <b>
                  ${escapeHTML(item.code)}
                  •
                  ${escapeHTML(item.category)}
                </b>

                <small>
                  ${escapeHTML(
                    lastMessage?.text ||
                    'No messages'
                  )}
                </small>
              </div>
            </button>
          `;
        })
        .join('');

    if (
      selectedMessageCode &&
      getCase(selectedMessageCode)
    ) {
      renderMessagePreview(
        selectedMessageCode
      );
    }
  }

  function renderMessagePreview(caseCode) {
    const concern = getCase(caseCode);

    if (!concern) {
      return;
    }

    selectedMessageCode = caseCode;

    updateCase(
      caseCode,
      item => ({
        ...item,
        unread: false
      })
    );

    $('#messagePreview').innerHTML = `
      <div class="inbox-chat">
        <div class="inbox-case-head">
          <div>
            <b>${escapeHTML(concern.code)}</b>

            <small>
              ${escapeHTML(concern.category)}
              •
              ${escapeHTML(concern.status)}
            </small>
          </div>

          <button
            type="button"
            data-open-case="${escapeHTML(concern.code)}"
          >
            View full case
          </button>
        </div>

        <div
          class="messages"
          id="inboxMessages"
        ></div>

        <form
          class="chat-form"
          id="inboxChatForm"
          data-code="${escapeHTML(concern.code)}"
        >
          <label
            class="sr-only"
            for="inboxChatInput"
          >
            Reply
          </label>

          <input
            id="inboxChatInput"
            maxlength="300"
            placeholder="Write a faculty reply..."
          />

          <button
            type="submit"
            aria-label="Send reply"
          >
            ↑
          </button>
        </form>
      </div>
    `;

    renderMessages(
      $('#inboxMessages'),
      concern.messages
    );

    $$('.message-case').forEach(button => {
      button.classList.toggle(
        'active',
        button.dataset.messageCase ===
          caseCode
      );
    });

    $('#messageNavCount').textContent =
      loadCases()
        .filter(item => item.unread)
        .length;
  }

  /* RESET PORTAL */

  function resetPortalData() {
    const confirmed = window.confirm(
      'Reset all browser-local cases to the original starter data?'
    );

    if (!confirmed) {
      return;
    }

    saveCases(cloneSeedCases());

    selectedMessageCode = '';

    renderFacultyDashboard();
    switchAdminSection('overview');

    showToast('Portal data reset');
  }

  /* FEEDBACK */

  function submitFeedback(event) {
    event.preventDefault();

    const feedback = {
      name: $('#feedbackName')
        .value
        .trim(),

      role: $('#feedbackRole').value,

      rating:
        $('#feedbackRating').value,

      message:
        $('#feedbackMessage')
          .value
          .trim(),

      createdAt: now()
    };

    if (
      !feedback.name ||
      !feedback.message
    ) {
      return;
    }

    let feedbackEntries = [];

    try {
      const savedFeedback =
        JSON.parse(
          localStorage.getItem(
            FEEDBACK_KEY
          )
        );

      if (Array.isArray(savedFeedback)) {
        feedbackEntries =
          savedFeedback;
      }
    } catch (error) {
      console.warn(
        'Could not read feedback.',
        error
      );
    }

    feedbackEntries.unshift(
      feedback
    );

    localStorage.setItem(
      FEEDBACK_KEY,
      JSON.stringify(feedbackEntries)
    );

    event.target.reset();

    $('#feedbackSuccess').hidden =
      false;

    showToast(
      'Thank you for your feedback'
    );
  }

  /* MAIN CLICK EVENTS */

  document.addEventListener(
    'click',
    event => {
      const routeButton =
        event.target.closest(
          '[data-route]'
        );

      if (routeButton) {
        route(
          routeButton.dataset.route
        );

        return;
      }

      const studentHomeButton =
        event.target.closest(
          '[data-student-home]'
        );

      if (studentHomeButton) {
        showStudentPanel(
          'studentStart'
        );

        return;
      }

      const adminSectionButton =
        event.target.closest(
          '[data-admin-section]'
        );

      if (adminSectionButton) {
        switchAdminSection(
          adminSectionButton
            .dataset
            .adminSection
        );

        return;
      }

      const openCaseButton =
        event.target.closest(
          '[data-open-case]'
        );

      if (openCaseButton) {
        openCaseDrawer(
          openCaseButton
            .dataset
            .openCase
        );

        return;
      }

      const messageCaseButton =
        event.target.closest(
          '[data-message-case]'
        );

      if (messageCaseButton) {
        renderMessagePreview(
          messageCaseButton
            .dataset
            .messageCase
        );

        return;
      }

      const statusButton =
        event.target.closest(
          '[data-set-status]'
        );

      if (statusButton) {
        setCaseStatus(
          statusButton.dataset.code,
          statusButton.dataset.setStatus
        );

        return;
      }

      const starterCodeButton =
        event.target.closest(
          '[data-starter-code]'
        );

      if (starterCodeButton) {
        $('#trackCode').value =
          starterCodeButton
            .dataset
            .starterCode;

        $('#trackForm')
          .requestSubmit();
      }
    }
  );

  /* STUDENT EVENT LISTENERS */

  $('#startReportBtn').addEventListener(
    'click',
    () => showStudentPanel('reportPanel')
  );

  $('#startTrackBtn').addEventListener(
    'click',
    () => showStudentPanel('trackPanel')
  );

  $('#showHelpBtn').addEventListener(
    'click',
    () => showStudentPanel('helpPanel')
  );

  $('#helpStartReport').addEventListener(
    'click',
    () => showStudentPanel('reportPanel')
  );

  $('#concernForm').addEventListener(
    'submit',
    submitConcern
  );

  $('#details').addEventListener(
    'input',
    event => {
      $('#detailsCount').textContent =
        `${event.target.value.length} / 800`;
    }
  );

  $('#copyCodeBtn').addEventListener(
    'click',
    async () => {
      try {
        await navigator.clipboard.writeText(
          currentStudentCode
        );

        showToast('Case code copied');
      } catch (error) {
        showToast(
          `Case code: ${currentStudentCode}`
        );
      }
    }
  );

  $('#viewNewCaseBtn').addEventListener(
    'click',
    () => openStudentCase(
      currentStudentCode
    )
  );

  $('#trackForm').addEventListener(
    'submit',
    event => {
      event.preventDefault();

      const enteredCode =
        $('#trackCode')
          .value
          .trim()
          .toUpperCase();

      if (!openStudentCase(enteredCode)) {
        $('#trackError').textContent =
          'Case code not found in this browser. Try SS-26-B4Q8X1.';
      } else {
        $('#trackError').textContent =
          '';
      }
    }
  );

  $('#trackCode').addEventListener(
    'input',
    event => {
      event.target.value =
        event.target.value
          .toUpperCase()
          .replace(
            /[^A-Z0-9-]/g,
            ''
          );

      $('#trackError').textContent =
        '';
    }
  );

  $('#backToTrack').addEventListener(
    'click',
    () => showStudentPanel('trackPanel')
  );

  $('#studentChatForm').addEventListener(
    'submit',
    event => {
      event.preventDefault();

      const messageInput =
        $('#studentChatInput');

      const updatedCase =
        addMessage(
          currentStudentCode,
          'student',
          messageInput.value
        );

      if (updatedCase) {
        messageInput.value = '';

        renderMessages(
          $('#studentMessages'),
          updatedCase.messages
        );

        showToast('Message added');
      }
    }
  );

  /* LOGIN EVENT LISTENERS */

  $('#studentLoginForm').addEventListener(
    'submit',
    studentLogin
  );

  $('#facultyLoginForm').addEventListener(
    'submit',
    facultyLogin
  );

  $('#fillStudentLogin').addEventListener(
    'click',
    () => {
      $('#studentEmail').value =
        STUDENT_EMAIL;

      $('#studentPassword').value =
        STUDENT_PASSWORD;

      $('#studentLoginError').textContent =
        '';
    }
  );

  $('#fillFacultyLogin').addEventListener(
    'click',
    () => {
      $('#facultyEmail').value =
        FACULTY_EMAIL;

      $('#facultyPassword').value =
        FACULTY_PASSWORD;

      $('#facultyLoginError').textContent =
        '';
    }
  );

  $('#toggleStudentPassword').addEventListener(
    'click',
    event => {
      togglePassword(
        '#studentPassword',
        event.currentTarget
      );
    }
  );

  $('#toggleFacultyPassword').addEventListener(
    'click',
    event => {
      togglePassword(
        '#facultyPassword',
        event.currentTarget
      );
    }
  );

  $('#studentLogoutBtn').addEventListener(
    'click',
    () => {
      sessionStorage.removeItem(
        STUDENT_SESSION_KEY
      );

      route('login');

      showToast(
        'Student signed out'
      );
    }
  );

  $('#adminLogoutBtn').addEventListener(
    'click',
    () => {
      sessionStorage.removeItem(
        FACULTY_SESSION_KEY
      );

      route('admin-login');

      showToast(
        'Faculty signed out'
      );
    }
  );

  /* FACULTY EVENT LISTENERS */

  $('#resetPortalBtn').addEventListener(
    'click',
    resetPortalData
  );

  $('#caseSearch').addEventListener(
    'input',
    renderOpenCases
  );

  $('#statusFilter').addEventListener(
    'change',
    renderOpenCases
  );

  $('#closeDrawer').addEventListener(
    'click',
    closeCaseDrawer
  );

  $('#drawerBackdrop').addEventListener(
    'click',
    closeCaseDrawer
  );

  document.addEventListener(
    'keydown',
    event => {
      if (event.key === 'Escape') {
        closeCaseDrawer();
      }
    }
  );

  /* FACULTY CHAT FORM */

  document.addEventListener(
    'submit',
    event => {
      const formId =
        event.target.id;

      if (
        formId !== 'drawerChatForm' &&
        formId !== 'inboxChatForm'
      ) {
        return;
      }

      event.preventDefault();

      const messageInput =
        $('input', event.target);

      const caseCode =
        event.target.dataset.code;

      const updatedCase =
        addMessage(
          caseCode,
          'staff',
          messageInput.value
        );

      if (!updatedCase) {
        return;
      }

      messageInput.value = '';

      if (
        formId === 'drawerChatForm'
      ) {
        renderMessages(
          $('#drawerMessages'),
          updatedCase.messages
        );
      } else {
        renderMessagePreview(
          caseCode
        );
      }

      renderFacultyDashboard();

      showToast(
        'Faculty reply added'
      );
    }
  );

  /* FEEDBACK EVENT */

  $('#feedbackForm').addEventListener(
    'submit',
    submitFeedback
  );

  /* INITIAL WEBSITE START */

  loadCases();

  const currentHash =
    location.hash.replace('#', '');

  if (currentHash === 'student') {
    route('student');
  } else if (
    [
      'admin',
      'admin-login',
      'home',
      'about',
      'feedback',
      'login'
    ].includes(currentHash)
  ) {
    route(currentHash);
  } else {
    route('login');
  }
})();