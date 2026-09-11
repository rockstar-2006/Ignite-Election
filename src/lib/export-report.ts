import { PostResult } from './server/voting';

/**
 * Builds the official SMVITM Election Results HTML document with table-based layout
 * completely compatible with Microsoft Word, Google Docs, and Browser Print-to-PDF.
 */
export function buildReportHtml(
  postResults: PostResult[],
  totalVotes: number,
  totalVoters: number,
  isPrintMode = false
): string {
  const currentDate = new Date().toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const currentTime = new Date().toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  // Determine winners for each post (including 1-seat and 2-seat Boy/Girl winners)
  const winnersRows: {
    postName: string;
    semester: string;
    winnerName: string;
    usn: string;
    department: string;
    category: string;
    votes: number;
    percentage: string;
  }[] = [];

  postResults.forEach((post) => {
    if (post.declaredWinners && post.declaredWinners.length > 0) {
      post.declaredWinners.forEach((dw) => {
        const cand = post.candidates.find((c) => c.candidateId === dw.candidateId);
        winnersRows.push({
          postName: post.postName,
          semester: post.semester,
          winnerName: dw.candidateName,
          usn: cand?.usn || '—',
          department: cand?.department || '—',
          category: dw.title || (dw.gender === 'Female' ? 'Girl Winner' : 'Boy Winner'),
          votes: dw.votes,
          percentage: cand ? `${cand.percentage}%` : '—',
        });
      });
    } else {
      const sorted = [...post.candidates].sort((a, b) => b.votes - a.votes);
      const top = sorted[0];
      winnersRows.push({
        postName: post.postName,
        semester: post.semester,
        winnerName: top && top.votes > 0 ? top.candidateName : 'No Votes Recorded',
        usn: top && top.votes > 0 ? top.usn : '—',
        department: top && top.votes > 0 ? top.department : '—',
        category: 'Elected Winner',
        votes: top ? top.votes : 0,
        percentage: top ? `${top.percentage}%` : '0%',
      });
    }
  });

  return `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>Official SMVITM Election Winners Declaration — ${currentDate}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page Section1 {
          size: 595.35pt 841.995pt;
          margin: 36pt 36pt 36pt 36pt;
          mso-header-margin: 36pt;
          mso-footer-margin: 36pt;
          mso-paper-source: 0;
        }
        div.Section1 {
          page: Section1;
        }
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 12mm 12mm 12mm;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
        }
        body {
          font-family: 'Segoe UI', Calibri, Arial, sans-serif;
          color: #122147;
          background-color: #ffffff;
          margin: 0;
          padding: ${isPrintMode ? '15px' : '0'};
          font-size: 10pt;
          line-height: 1.4;
        }
        table {
          border-collapse: collapse;
          mso-table-lspace: 0pt;
          mso-table-rspace: 0pt;
        }
        tr {
          page-break-inside: avoid;
        }
        th, td {
          font-family: 'Segoe UI', Calibri, Arial, sans-serif;
        }
        .btn-print {
          background-color: #7B1436;
          color: #ffffff;
          border: none;
          padding: 8px 18px;
          border-radius: 6px;
          font-weight: bold;
          font-size: 12px;
          cursor: pointer;
        }
      </style>
    </head>
    <body>
      ${
        isPrintMode
          ? `
        <div class="no-print" style="margin-bottom: 15px; padding: 10px 15px; background-color: #FAF7F2; border: 1px solid #EAE3D9; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 12px; font-weight: bold; color: #122147;">SMVITM Election Commission — Official Report Preview</span>
          <button class="btn-print" onclick="window.print()">Print / Save as PDF</button>
        </div>
      `
          : ''
      }

      <div class="Section1">

        <!-- Institutional Letterhead Table -->
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-bottom: 18px; border-bottom: 3px solid #7B1436;">
          <tr>
            <td align="center" style="padding: 16px 12px; background-color: #FAF7F2; border-top: 5px solid #122147;">
              <div style="font-size: 16pt; font-weight: bold; color: #122147; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 3px;">
                SHRI MADHWA VADIRAJA INSTITUTE OF TECHNOLOGY &amp; MANAGEMENT
              </div>
              <div style="font-size: 10.5pt; font-weight: 600; color: #7B1436; margin-bottom: 2px;">
                Vishwothama Nagar, Bantakal, Udupi – 574115, Karnataka • SODE Educational Society
              </div>
              <div style="font-size: 8.5pt; color: #475569; margin-bottom: 8px;">
                Accredited by NAAC with &apos;A&apos; Grade • Affiliated to VTU Belagavi • Approved by AICTE, New Delhi
              </div>
              <div style="font-size: 12pt; font-weight: bold; color: #7B1436; background-color: #FAF3E8; border: 1px solid #E8D3B5; padding: 5px 12px; margin-bottom: 5px;">
                STUDENT COUNCIL ELECTIONS 2026–27 — OFFICIAL RESULTS &amp; WINNERS CERTIFICATE
              </div>
              <div style="font-size: 9pt; color: #A37332; font-style: italic; margin-bottom: 6px;">
                सर्वे भद्राणि पश्यन्तु — May all see auspiciousness
              </div>
              <div style="font-size: 9pt; color: #122147; background-color: #ffffff; border: 1px solid #EAE3D9; padding: 4px 10px; display: inline-block;">
                Certified by Election Commission on <strong>${currentDate}</strong> at <strong>${currentTime} (IST)</strong>
              </div>
            </td>
          </tr>
        </table>

        <!-- Executive Statistics Summary Table -->
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-bottom: 22px;">
          <tr>
            <td width="33%" align="center" style="padding: 10px; background-color: #ffffff; border: 1px solid #CBD5E1;">
              <div style="font-size: 20pt; font-weight: bold; color: #7B1436;">${totalVotes}</div>
              <div style="font-size: 8pt; font-weight: bold; color: #122147; text-transform: uppercase; letter-spacing: 0.5px;">Total Ballots Cast</div>
            </td>
            <td width="34%" align="center" style="padding: 10px; background-color: #ffffff; border: 1px solid #CBD5E1;">
              <div style="font-size: 20pt; font-weight: bold; color: #7B1436;">${totalVoters}</div>
              <div style="font-size: 8pt; font-weight: bold; color: #122147; text-transform: uppercase; letter-spacing: 0.5px;">Unique Student Electors</div>
            </td>
            <td width="33%" align="center" style="padding: 10px; background-color: #ffffff; border: 1px solid #CBD5E1;">
              <div style="font-size: 20pt; font-weight: bold; color: #7B1436;">${postResults.length}</div>
              <div style="font-size: 8pt; font-weight: bold; color: #122147; text-transform: uppercase; letter-spacing: 0.5px;">Council Posts Contested</div>
            </td>
          </tr>
        </table>

        <!-- Section 1: Official Certified Winners Table -->
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-bottom: 8px;">
          <tr>
            <td style="padding: 6px 0px; border-bottom: 2px solid #7B1436;">
              <span style="font-size: 11pt; font-weight: bold; color: #122147; text-transform: uppercase;">
                1. Official Certified Winners Summary
              </span>
            </td>
          </tr>
        </table>

        <table width="100%" cellpadding="6" cellspacing="0" style="border-collapse: collapse; margin-bottom: 28px; font-size: 9pt;">
          <thead>
            <tr style="background-color: #122147; color: #ffffff;">
              <th width="22%" align="left" style="padding: 7px 8px; border: 1px solid #122147; font-size: 8.5pt;">Position &amp; Semester</th>
              <th width="15%" align="left" style="padding: 7px 8px; border: 1px solid #122147; font-size: 8.5pt;">Category</th>
              <th width="23%" align="left" style="padding: 7px 8px; border: 1px solid #122147; font-size: 8.5pt;">Declared Winner</th>
              <th width="15%" align="left" style="padding: 7px 8px; border: 1px solid #122147; font-size: 8.5pt;">USN Number</th>
              <th width="10%" align="left" style="padding: 7px 8px; border: 1px solid #122147; font-size: 8.5pt;">Branch</th>
              <th width="8%" align="center" style="padding: 7px 6px; border: 1px solid #122147; font-size: 8.5pt;">Votes</th>
              <th width="7%" align="center" style="padding: 7px 6px; border: 1px solid #122147; font-size: 8.5pt;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${winnersRows
              .map(
                (row, idx) => `
              <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#FAF7F2'};">
                <td style="padding: 7px 8px; border: 1px solid #CBD5E1;">
                  <strong>${row.postName}</strong><br>
                  <span style="font-size: 7.5pt; color: #64748b;">${row.semester} Semester</span>
                </td>
                <td style="padding: 7px 8px; border: 1px solid #CBD5E1; color: #7B1436; font-weight: bold; font-size: 8pt;">
                  ${row.category}
                </td>
                <td style="padding: 7px 8px; border: 1px solid #CBD5E1; font-weight: bold; color: #122147;">
                  ${row.winnerName}
                </td>
                <td style="padding: 7px 8px; border: 1px solid #CBD5E1; font-family: Consolas, monospace; font-size: 8pt;">
                  ${row.usn}
                </td>
                <td style="padding: 7px 8px; border: 1px solid #CBD5E1;">
                  ${row.department}
                </td>
                <td align="center" style="padding: 7px 6px; border: 1px solid #CBD5E1;">
                  <strong>${row.votes}</strong><br>
                  <span style="font-size: 7.5pt; color: #64748b;">${row.percentage}</span>
                </td>
                <td align="center" style="padding: 7px 6px; border: 1px solid #CBD5E1;">
                  <span style="background-color: #FAF3E8; color: #A37332; font-weight: bold; padding: 2px 5px; border: 1px solid #E8D3B5; font-size: 7.5pt;">ELECTED</span>
                </td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>

        <!-- Section 2: Detailed Vote Breakdown per Position -->
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-bottom: 12px; page-break-before: auto;">
          <tr>
            <td style="padding: 6px 0px; border-bottom: 2px solid #7B1436;">
              <span style="font-size: 11pt; font-weight: bold; color: #122147; text-transform: uppercase;">
                2. Detailed Vote Breakdown per Contested Position
              </span>
            </td>
          </tr>
        </table>

        ${postResults
          .map(
            (post) => `
          <table width="100%" cellpadding="5" cellspacing="0" style="border-collapse: collapse; margin-bottom: 14px; border: 1px solid #CBD5E1; font-size: 8.5pt; page-break-inside: avoid;">
            <thead>
              <tr style="background-color: #FAF3E8;">
                <th colspan="7" align="left" style="padding: 6px 8px; border-bottom: 1.5px solid #E8D3B5; color: #7B1436; font-size: 9.5pt; font-weight: bold;">
                  ${post.postName} (${post.semester} Sem) — Total Ballots Cast: ${post.totalVotes}
                </th>
              </tr>
              <tr style="background-color: #F1F5F9; color: #334155; font-size: 8pt; text-transform: uppercase;">
                <th width="28%" align="left" style="padding: 5px 8px; border: 1px solid #CBD5E1;">Candidate Name</th>
                <th width="10%" align="center" style="padding: 5px 6px; border: 1px solid #CBD5E1;">Gender</th>
                <th width="18%" align="left" style="padding: 5px 8px; border: 1px solid #CBD5E1;">USN</th>
                <th width="14%" align="left" style="padding: 5px 8px; border: 1px solid #CBD5E1;">Branch</th>
                <th width="10%" align="center" style="padding: 5px 6px; border: 1px solid #CBD5E1;">Votes</th>
                <th width="10%" align="center" style="padding: 5px 6px; border: 1px solid #CBD5E1;">Vote Share</th>
                <th width="10%" align="center" style="padding: 5px 6px; border: 1px solid #CBD5E1;">Outcome</th>
              </tr>
            </thead>
            <tbody>
              ${
                post.candidates && post.candidates.length > 0
                  ? post.candidates
                      .map(
                        (cand) => `
                    <tr style="background-color: ${cand.isLeading ? '#FAF7F2' : '#ffffff'};">
                      <td style="padding: 5px 8px; border: 1px solid #CBD5E1; font-weight: ${cand.isLeading ? 'bold' : 'normal'}; color: #122147;">
                        ${cand.candidateName}
                      </td>
                      <td align="center" style="padding: 5px 6px; border: 1px solid #CBD5E1; color: #475569;">
                        ${cand.gender || '—'}
                      </td>
                      <td style="padding: 5px 8px; border: 1px solid #CBD5E1; font-family: Consolas, monospace; font-size: 7.5pt;">
                        ${cand.usn || '—'}
                      </td>
                      <td style="padding: 5px 8px; border: 1px solid #CBD5E1; color: #475569;">
                        ${cand.department || '—'}
                      </td>
                      <td align="center" style="padding: 5px 6px; border: 1px solid #CBD5E1; font-weight: bold; color: #122147;">
                        ${cand.votes}
                      </td>
                      <td align="center" style="padding: 5px 6px; border: 1px solid #CBD5E1; color: #475569;">
                        ${cand.percentage}%
                      </td>
                      <td align="center" style="padding: 5px 6px; border: 1px solid #CBD5E1;">
                        ${
                          cand.winnerCategory
                            ? `<span style="color: #7B1436; font-weight: bold; font-size: 8pt;">★ ${cand.winnerCategory}</span>`
                            : cand.isLeading
                            ? '<span style="color: #7B1436; font-weight: bold; font-size: 8pt;">★ Winner</span>'
                            : '<span style="color: #64748b; font-size: 8pt;">Contestant</span>'
                        }
                      </td>
                    </tr>
                  `
                      )
                      .join('')
                  : `
                  <tr>
                    <td colspan="7" align="center" style="padding: 10px; color: #94a3b8; font-style: italic; background-color: #ffffff; border: 1px solid #CBD5E1;">
                      No candidate nominations were contested for this position.
                    </td>
                  </tr>
                `
              }
            </tbody>
          </table>
        `
          )
          .join('')}

        <!-- Section 3: Official Certification Signatures -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px; page-break-inside: avoid; border: 1px solid #CBD5E1; background-color: #ffffff;">
          <tr>
            <td colspan="3" style="padding: 8px 12px; background-color: #FAF7F2; border-bottom: 1px solid #CBD5E1; font-size: 8.5pt; font-weight: bold; color: #122147; text-transform: uppercase;">
              Official Certification &amp; Authentication of Results
            </td>
          </tr>
          <tr>
            <td width="33%" align="center" style="padding: 35px 10px 14px 10px; vertical-align: bottom;">
              <div style="border-top: 1.5px solid #122147; width: 80%; margin: 0 auto 6px auto;"></div>
              <div style="font-weight: bold; font-size: 9pt; color: #122147;">Chief Returning Officer</div>
              <div style="font-size: 7.5pt; color: #64748b;">Election Commission, SMVITM</div>
            </td>
            <td width="34%" align="center" style="padding: 35px 10px 14px 10px; vertical-align: bottom;">
              <div style="border-top: 1.5px solid #122147; width: 80%; margin: 0 auto 6px auto;"></div>
              <div style="font-weight: bold; font-size: 9pt; color: #122147;">Faculty Advisor</div>
              <div style="font-size: 7.5pt; color: #64748b;">Student Affairs Committee</div>
            </td>
            <td width="33%" align="center" style="padding: 35px 10px 14px 10px; vertical-align: bottom;">
              <div style="border-top: 1.5px solid #122147; width: 80%; margin: 0 auto 6px auto;"></div>
              <div style="font-weight: bold; font-size: 9pt; color: #122147;">Principal / Head of Institution</div>
              <div style="font-size: 7.5pt; color: #64748b;">SMVITM Bantakal, Udupi</div>
            </td>
          </tr>
        </table>

        <!-- Document Hash & Audit Metadata Footer -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 20px; page-break-inside: avoid;">
          <tr>
            <td align="center" style="font-size: 7.5pt; color: #94a3b8; line-height: 1.4;">
              SHRI MADHWA VADIRAJA INSTITUTE OF TECHNOLOGY &amp; MANAGEMENT • BANTAKAL, UDUPI<br>
              CONFIDENTIAL OFFICIAL SECURE E-BALLOT AUDIT RECORD • ARCHIVED FOR COLLEGE RECORDS
            </td>
          </tr>
        </table>

      </div>
    </body>
    </html>
  `;
}

/**
 * Generate and trigger download of an official SMVITM Election Winners & Results Document (.doc format compatible with Word & Docs)
 */
export function downloadWinnersDocument(postResults: PostResult[], totalVotes: number, totalVoters: number) {
  const currentDate = new Date().toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const docHtml = buildReportHtml(postResults, totalVotes, totalVoters, false);

  // Create blob and initiate download
  const blob = new Blob(['\ufeff', docHtml], {
    type: 'application/msword;charset=utf-8',
  });

  const url = URL.createObjectURL(blob);
  const downloadLink = document.createElement('a');
  downloadLink.href = url;
  downloadLink.download = `SMVITM_Election_Official_Results_${currentDate.replace(/\s+/g, '_')}.doc`;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  URL.revokeObjectURL(url);
}

/**
 * Open instant Print / Save as PDF view with printable margins
 */
export function printWinnersReport(postResults: PostResult[], totalVotes: number, totalVoters: number) {
  const printWindow = window.open('', '_blank', 'width=950,height=850');
  if (!printWindow) {
    alert('Please allow popups to open the Print / Save as PDF report.');
    return;
  }

  const docHtml = buildReportHtml(postResults, totalVotes, totalVoters, true);
  printWindow.document.open();
  printWindow.document.write(docHtml);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 400);
}
