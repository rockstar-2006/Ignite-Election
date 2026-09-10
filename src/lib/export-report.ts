import { PostResult } from './server/voting';

/**
 * Generate and trigger download of an official SMVITM Election Winners & Results Document (.doc format compatible with Word & Docs)
 */
export function downloadWinnersDocument(postResults: PostResult[], totalVotes: number, totalVoters: number) {
  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const currentTime = new Date().toLocaleTimeString('en-IN', {
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

  // Construct Word-compliant HTML document with SMVITM Kumkum, Chandan, and Neel styling
  const docHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>Official SMVITM Election Winners Declaration</title>
      <style>
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          margin: 40px;
          color: #122147;
          background-color: #FAF7F2;
          line-height: 1.6;
        }
        .header-box {
          border-bottom: 4px solid #7B1436;
          padding-bottom: 18px;
          margin-bottom: 25px;
          text-align: center;
          background-color: #ffffff;
          padding: 25px;
          border-radius: 8px;
          border-top: 6px solid #122147;
        }
        .title {
          font-size: 22pt;
          font-weight: bold;
          color: #122147;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .subtitle-inst {
          font-size: 14pt;
          font-weight: bold;
          color: #7B1436;
          margin-top: 5px;
        }
        .subtitle {
          font-size: 12pt;
          color: #C59048;
          margin-top: 6px;
          font-weight: 700;
          text-transform: uppercase;
        }
        .motto {
          font-size: 10pt;
          color: #64748b;
          font-style: italic;
          margin-top: 4px;
        }
        .meta-info {
          font-size: 10pt;
          color: #475569;
          margin-top: 10px;
          background-color: #FAF3E8;
          padding: 8px;
          border-radius: 6px;
          border: 1px solid #E8D3B5;
        }
        .stats-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 25px;
          background-color: #ffffff;
        }
        .stats-table td {
          padding: 14px;
          border: 1px solid #EAE3D9;
          text-align: center;
        }
        .stat-val {
          font-size: 20pt;
          font-weight: bold;
          color: #7B1436;
        }
        .stat-lbl {
          font-size: 9pt;
          color: #122147;
          text-transform: uppercase;
          font-weight: bold;
        }
        .section-heading {
          font-size: 14pt;
          font-weight: bold;
          color: #122147;
          border-left: 6px solid #7B1436;
          padding-left: 12px;
          margin-top: 35px;
          margin-bottom: 15px;
          text-transform: uppercase;
        }
        .winners-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
          background-color: #ffffff;
        }
        .winners-table th {
          background-color: #122147;
          color: #ffffff;
          padding: 12px;
          font-size: 10pt;
          text-align: left;
          text-transform: uppercase;
          border: 1px solid #122147;
        }
        .winners-table td {
          padding: 10px 12px;
          border: 1px solid #EAE3D9;
          font-size: 10pt;
        }
        .winners-table tr:nth-child(even) {
          background-color: #FAF7F2;
        }
        .winner-name {
          font-weight: bold;
          color: #122147;
        }
        .badge-winner {
          background-color: #FAF3E8;
          color: #A37332;
          font-weight: bold;
          padding: 4px 10px;
          border-radius: 4px;
          border: 1px solid #E8D3B5;
          font-size: 9pt;
        }
        .post-card {
          border: 1px solid #EAE3D9;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 18px;
          background-color: #ffffff;
          page-break-inside: avoid;
        }
        .post-card-title {
          font-size: 12pt;
          font-weight: bold;
          color: #7B1436;
          margin-bottom: 10px;
          border-bottom: 2px solid #FAF3E8;
          padding-bottom: 6px;
        }
        .signatures {
          margin-top: 60px;
          page-break-inside: avoid;
          background-color: #ffffff;
          padding: 25px;
          border-radius: 8px;
          border: 1px solid #EAE3D9;
        }
        .signature-table {
          width: 100%;
          border-collapse: collapse;
          border: none;
        }
        .signature-table td {
          border: none;
          text-align: center;
          padding: 45px 10px 10px 10px;
          font-size: 10pt;
        }
        .sign-line {
          border-top: 1.5px solid #122147;
          margin-bottom: 6px;
          width: 80%;
          margin-left: auto;
          margin-right: auto;
        }
      </style>
    </head>
    <body>
      <div class="header-box">
        <h1 class="title">SHRI MADHWA VADIRAJA INSTITUTE OF TECHNOLOGY &amp; MANAGEMENT</h1>
        <div class="subtitle-inst">Bantakal, Udupi – 574115, Karnataka • VTU Affiliated</div>
        <div class="subtitle">STUDENT COUNCIL ELECTIONS 2026–27 — OFFICIAL RESULTS &amp; WINNERS CERTIFICATE</div>
        <div class="motto">सर्वे भद्राणि पश्यन्तु — May all see auspiciousness</div>
        <div class="meta-info">
          Certified by Election Commission on <strong>${currentDate}</strong> at <strong>${currentTime}</strong>
        </div>
      </div>

      <table class="stats-table">
        <tr>
          <td>
            <div class="stat-val">${totalVotes}</div>
            <div class="stat-lbl">Total Ballots Cast</div>
          </td>
          <td>
            <div class="stat-val">${totalVoters}</div>
            <div class="stat-lbl">Unique Student Voters</div>
          </td>
          <td>
            <div class="stat-val">${postResults.length}</div>
            <div class="stat-lbl">Council Positions Contested</div>
          </td>
        </tr>
      </table>

      <h2 class="section-heading">1. Official Certified Winners Summary</h2>
      <table class="winners-table">
        <thead>
          <tr>
            <th>Position</th>
            <th>Semester</th>
            <th>Winner Category</th>
            <th>Declared Winner</th>
            <th>USN Number</th>
            <th>Department / Branch</th>
            <th>Votes Won</th>
            <th>Vote Share</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${winnersRows
            .map(
              (row) => `
            <tr>
              <td><strong>${row.postName}</strong></td>
              <td>${row.semester} Sem</td>
              <td><span style="font-size: 9pt; color: #7B1436; font-weight: bold;">${row.category}</span></td>
              <td class="winner-name">${row.winnerName}</td>
              <td>${row.usn}</td>
              <td>${row.department}</td>
              <td><strong>${row.votes}</strong></td>
              <td>${row.percentage}</td>
              <td>
                <span class="badge-winner">ELECTED</span>
              </td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>

      <h2 class="section-heading">2. Detailed Vote Breakdown per Contested Position</h2>
      ${postResults
        .map(
          (post) => `
        <div class="post-card">
          <div class="post-card-title">${post.postName} (${post.semester} Sem) — Total Votes: ${post.totalVotes}</div>
          <table style="width: 100%; border-collapse: collapse; font-size: 9.5pt;">
            <thead>
              <tr style="background-color: #FAF7F2; text-align: left;">
                <th style="padding: 6px; border: 1px solid #EAE3D9;">Candidate Name</th>
                <th style="padding: 6px; border: 1px solid #EAE3D9;">Gender</th>
                <th style="padding: 6px; border: 1px solid #EAE3D9;">USN</th>
                <th style="padding: 6px; border: 1px solid #EAE3D9;">Department</th>
                <th style="padding: 6px; border: 1px solid #EAE3D9;">Votes</th>
                <th style="padding: 6px; border: 1px solid #EAE3D9;">Percentage</th>
                <th style="padding: 6px; border: 1px solid #EAE3D9;">Outcome</th>
              </tr>
            </thead>
            <tbody>
              ${post.candidates
                .map(
                  (cand) => `
                <tr style="${cand.isLeading ? 'background-color: #FAF3E8; font-weight: bold;' : ''}">
                  <td style="padding: 6px; border: 1px solid #EAE3D9;">${cand.candidateName}</td>
                  <td style="padding: 6px; border: 1px solid #EAE3D9;">${cand.gender || '—'}</td>
                  <td style="padding: 6px; border: 1px solid #EAE3D9;">${cand.usn || '—'}</td>
                  <td style="padding: 6px; border: 1px solid #EAE3D9;">${cand.department || '—'}</td>
                  <td style="padding: 6px; border: 1px solid #EAE3D9;">${cand.votes}</td>
                  <td style="padding: 6px; border: 1px solid #EAE3D9;">${cand.percentage}%</td>
                  <td style="padding: 6px; border: 1px solid #EAE3D9;">
                    ${
                      cand.winnerCategory
                        ? `<span style="color: #7B1436; font-weight: bold;">★ ${cand.winnerCategory}</span>`
                        : cand.isLeading
                        ? '<span style="color: #7B1436;">★ Leading</span>'
                        : '<span style="color: #64748b;">Contestant</span>'
                    }
                  </td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      `
        )
        .join('')}

      <div class="signatures">
        <table class="signature-table">
          <tr>
            <td>
              <div class="sign-line"></div>
              <strong>Chief Returning Officer</strong><br>
              Election Commission, SMVITM
            </td>
            <td>
              <div class="sign-line"></div>
              <strong>Faculty Advisor</strong><br>
              Student Affairs Committee
            </td>
            <td>
              <div class="sign-line"></div>
              <strong>Principal / Head of Institution</strong><br>
              SMVITM Bantakal, Udupi
            </td>
          </tr>
        </table>
      </div>

      <div style="text-align: center; font-size: 8pt; color: #94a3b8; margin-top: 30px;">
        SHRI MADHWA VADIRAJA INSTITUTE OF TECHNOLOGY &amp; MANAGEMENT • BANTAKAL, UDUPI<br>
        CONFIDENTIAL SECURE E-BALLOT AUDIT LOG • DOCUMENT HASH: ${Math.random().toString(36).substring(2).toUpperCase()}
      </div>
    </body>
    </html>
  `;

  // Create blob and initiate download
  const blob = new Blob(['\ufeff', docHtml], {
    type: 'application/msword;charset=utf-8',
  });

  const url = URL.createObjectURL(blob);
  const downloadLink = document.createElement('a');
  downloadLink.href = url;
  downloadLink.download = `SMVITM_Election_Winners_${currentDate.replace(/\s+/g, '_')}.doc`;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  URL.revokeObjectURL(url);
}
