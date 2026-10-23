# LinkedIn drafts

Drafts only. Do not publish automatically. Use the actual screenshots and verification evidence. The project is self-initiated; the household and amounts are synthetic.

## 1. The problem

Someone moves into a shared home halfway through the billing period. Should they pay half the electricity bill?

I’m exploring that small workflow with ProrateSplit, a self-initiated ConsoleLog Studio project.

The idea is straightforward: enter the people, their dates, and the bill. Then see exactly how each share was calculated.

The tricky part is making the date rules understandable. If someone leaves on October 17, is that day included? The product needs to say so before anyone relies on the result.

If you manage rentals or shared accommodation, how do you explain partial-period charges today?

Visual: landing screenshot or a cropped actual bill breakdown.

## 2. A build decision

A 300.00 bill. One person stays 30 days. Another arrives on day 16.

In ProrateSplit’s occupied-day policy, the shares are 225.00 and 75.00.

Dividing the whole bill by total person-days would give a different answer. Instead, the app splits each day’s equal portion among the selected people present that day.

Then it rounds once per person, with every cent accounted for. A three-way 1.00 equal split becomes 0.34, 0.33, and 0.33 in a stable order.

It’s a small calculator, but the rules underneath it are the kind of details that matter in business software.

Self-initiated studio project. Synthetic example, covered by automated tests.

Visual: actual Cedar House settlement and expanded date segments.

## 3. The finished workflow

I built ProrateSplit to make shared household bills easier to explain.

The walkthrough shows a complete flow: load a sample household, review everyone’s share, duplicate a what-if scenario, change a departure date, and produce a report.

It runs locally in the browser. There are no accounts or household uploads. Data stays on the device, so exporting backups is part of the workflow.

The focus was a complete, reviewable result: precise dates and money, honest save feedback, safe backup restoration, and a useful printout.

Source: https://github.com/shawalkabirchy/ProrateSplit

This is a self-initiated ConsoleLog Studio project, not commissioned client work. If your team has a workflow like this, I’d be interested in how you handle it today.

Visual: 30–60 second walkthrough. Add a hosted demo link only after an eligible deployment exists.
