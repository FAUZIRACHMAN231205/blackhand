# Manual Testing Checklist - BLACKHAND Project

## 🚀 Pre-Testing Setup

- [ ] Dev server running: `npm run dev`
- [ ] Browser ready
- [ ] Supabase credentials configured in `.env.local`
- [ ] Open DevTools (F12) for debugging

---

## 📱 Test Flow 1: Landing Page & Public Access

### Landing Page Load

- [ ] Navigate to `http://localhost:3000`
- [ ] Page loads without errors
- [ ] Navbar displays correctly
- [ ] BLACKHAND logo visible
- [ ] Background image loads
- [ ] Page is responsive (test on mobile view too)

### Navbar Functionality

- [ ] "Identity" button visible (when not logged in)
- [ ] Clicking "Identity" opens auth modal
- [ ] Logo is clickable
- [ ] Navigation menu items visible on desktop
- [ ] Mobile menu works (if implemented)

### Modal Interaction

- [ ] Modal opens smoothly
- [ ] Modal can be closed (X button)
- [ ] Overlay click closes modal
- [ ] Modal is responsive

---

## 🔐 Test Flow 2: Authentication - Email OTP

### Email OTP Flow

1. [ ] Click "Identity" button
2. [ ] Modal opens
3. [ ] Enter valid email: `test@example.com`
4. [ ] Click "Continue"
5. [ ] Modal shows "Sending..." state
6. [ ] Modal transitions to OTP step
7. [ ] Text shows "Enter code"
8. [ ] Text shows email confirmation
9. [ ] OTP input field appears (6-digit code)
10. [ ] Enter test OTP code (6 digits)
11. [ ] Click "Submit"
12. [ ] Wait for verification...
13. [ ] Auto-redirect to `/dashboard`
14. [ ] User info displays correctly

### Error Handling - Invalid Email

- [ ] Try invalid email format
- [ ] Error message appears
- [ ] Cannot submit with invalid email

### Error Handling - Wrong OTP

- [ ] Enter wrong OTP code
- [ ] Error message shows
- [ ] Can try again
- [ ] Can go back to email step

---

## 🔐 Test Flow 3: Authentication - Google OAuth

### Google Login Flow

1. [ ] Click "Identity" button
2. [ ] Click "Continue with Google"
3. [ ] Redirected to Google login (or mock)
4. [ ] After auth, redirected back to `/dashboard`
5. [ ] User profile shows Google account info
6. [ ] Avatar displays correctly
7. [ ] User metadata shows Google provider

### Error Recovery

- [ ] If Google auth fails, error message shown
- [ ] Can try again
- [ ] Modal stays open

---

## 📊 Test Flow 4: Dashboard Features

### Profile Card Display

- [ ] User profile card displays
- [ ] Avatar shows correctly
- [ ] User full name displays
- [ ] Account age shows (e.g., "X days member")
- [ ] Authentication method badge shows ("Google" or "Email")
- [ ] "Edit Profile" button visible

### Statistics Cards (4 Cards)

- [ ] **Card 1 - Account Status**: Shows "Active"
- [ ] **Card 2 - Email**: Shows user email
- [ ] **Card 3 - Last Sign In**: Shows correct date
- [ ] **Card 4 - Security**: Shows "Secure"
- [ ] All cards have proper icons
- [ ] Cards are responsive

### Quick Actions Section

- [ ] 3 action cards visible: Settings, Projects, Support
- [ ] Each card has icon and description
- [ ] Hover effect works on desktop
- [ ] "Settings" card is clickable

### Detailed Account Information

- [ ] User ID displays (truncated or full)
- [ ] Account created date shows
- [ ] Last sign in timestamp shows
- [ ] Authentication method displays

### Responsive Design

- [ ] Dashboard looks good on mobile
- [ ] Dashboard looks good on tablet
- [ ] Dashboard looks good on desktop
- [ ] Proper spacing and alignment

---

## ⚙️ Test Flow 5: Settings Page

### Access Settings

- [ ] Click "Edit Profile" button on dashboard
- [ ] OR navigate to `http://localhost:3000/settings`
- [ ] Settings page loads
- [ ] Back arrow navigation visible
- [ ] Two tabs visible: "Profile" and "Security"

### Profile Tab

- [ ] Profile tab is active by default
- [ ] "Full Name" input field editable
- [ ] Current name pre-filled
- [ ] Email displays as read-only
- [ ] Profile picture shows (if from OAuth)
- [ ] "Save Changes" button visible
- [ ] Edit and save full name:
  - [ ] Type new name
  - [ ] Click "Save Changes"
  - [ ] Success message appears
  - [ ] Name updates in database (if connected)

### Security Tab

- [ ] Click Security tab
- [ ] Shows current authentication method
- [ ] If email auth:
  - [ ] Password change form visible
  - [ ] "New Password" field
  - [ ] "Confirm Password" field
  - [ ] Password visibility toggle works
  - [ ] Minimum 6 characters validation
  - [ ] Both passwords must match
  - [ ] "Update Password" button works
- [ ] If OAuth:
  - [ ] Shows "You are using OAuth authentication..."
  - [ ] Password form hidden
  - [ ] Appropriate message displayed

### Session Information

- [ ] "Last Sign In" displays date and time
- [ ] "Account Created" displays date and time
- [ ] Dates are formatted correctly

### Error Handling

- [ ] Try submitting empty form
- [ ] Try mismatched passwords
- [ ] Error messages display
- [ ] Try password too short
- [ ] Error message shows requirement

---

## 🛡️ Test Flow 6: Error Boundary & Error Handling

### Trigger Error Boundary

1. [ ] Open browser DevTools (F12)
2. [ ] Go to any page
3. [ ] In console, try throwing an error
4. [ ] Error Boundary catches it
5. [ ] Error UI displays:
   - [ ] "Something went wrong" message
   - [ ] Error details section
   - [ ] "Try Again" button
   - [ ] "Home" button
6. [ ] Click "Try Again" - error clears
7. [ ] Click "Home" - navigate to home page

### Expandable Error Details

- [ ] Error details section has "Error Details" text
- [ ] Click to expand error message
- [ ] Error message displays
- [ ] Can collapse again

---

## ⏳ Test Flow 7: Loading States

### Initial Load

- [ ] Fresh page load shows loading spinner briefly
- [ ] Spinner animates smoothly
- [ ] "Loading..." text displays

### Dashboard Load States

- [ ] When refreshing dashboard, skeleton appears
- [ ] Skeleton cards animate with pulse effect
- [ ] Profile skeleton shows placeholder
- [ ] 4 stats card skeletons appear
- [ ] Content smoothly replaces skeleton

### API Loading

- [ ] Profile save shows loading state
- [ ] Button text changes to "Saving..." or "Updating..."
- [ ] Button is disabled during request
- [ ] After response, normal state returns

---

## 🔗 Test Flow 8: Navigation & Routing

### Route Protection

- [ ] Try accessing `/dashboard` while logged out
- [ ] Should redirect to home page
- [ ] Try accessing `/settings` while logged out
- [ ] Should redirect to home page

### Navigation Links

- [ ] Logo/Blackhand text takes you to home
- [ ] Dashboard button visible when logged in
- [ ] Settings accessible from dashboard
- [ ] Can navigate back using browser back button

### Logout Functionality

- [ ] Click logout button
- [ ] User logs out successfully
- [ ] Redirects to home page
- [ ] Cannot access dashboard anymore
- [ ] Navbar shows "Identity" button again

---

## 📱 Test Flow 9: Responsive Design

### Mobile (320px - 480px)

- [ ] All elements stack vertically
- [ ] Text is readable
- [ ] Buttons are tappable
- [ ] Images scale correctly
- [ ] No horizontal scroll

### Tablet (481px - 768px)

- [ ] Layout adjusts for tablet
- [ ] 2-column layouts work
- [ ] Navigation adapts
- [ ] Stats cards display properly

### Desktop (1024px+)

- [ ] Full desktop layout
- [ ] Multi-column layouts
- [ ] All features visible
- [ ] Proper spacing

---

## 🎨 Test Flow 10: Styling & Visual Design

### Color Scheme

- [ ] Dark theme (black/gray/white)
- [ ] Consistent color usage
- [ ] Good contrast ratios

### Typography

- [ ] Cormorant Garamond font for headers
- [ ] Poppins font for body
- [ ] Proper font sizes
- [ ] Font weights look correct

### Components

- [ ] Buttons have hover states
- [ ] Cards have shadow/border effects
- [ ] Icons display correctly
- [ ] Spacing is consistent
- [ ] Border radius appropriate

### Animations

- [ ] Smooth transitions
- [ ] Loading spinner animates
- [ ] Modal appears smoothly
- [ ] No janky animations

---

## 🔒 Test Flow 11: Security & Data Handling

### Sensitive Data

- [ ] User IDs masked/truncated in UI
- [ ] Passwords never logged
- [ ] Error messages don't expose system info
- [ ] API keys not exposed in frontend

### Form Security

- [ ] Password fields are type="password"
- [ ] Password visibility toggle works
- [ ] Form data sent over HTTPS (in production)

### Session Management

- [ ] Session persists on page refresh
- [ ] Only one active session per user
- [ ] Logout clears session
- [ ] Can't access protected routes without session

---

## 🐛 Test Flow 12: Browser Console

### Check Console for Errors

- [ ] No red error messages
- [ ] No critical warnings
- [ ] Network requests successful (200, 201 status)
- [ ] No CORS errors
- [ ] No undefined variable errors

### Check Network Tab

- [ ] All API calls return success status
- [ ] No failed requests
- [ ] Response times reasonable
- [ ] Images load quickly

---

## ✅ Final Verification Checklist

After completing all test flows:

- [ ] All pages load without errors
- [ ] Authentication works (both methods)
- [ ] Dashboard displays user info
- [ ] Settings page allows edits
- [ ] Navigation works correctly
- [ ] Responsive on all devices
- [ ] Error handling works
- [ ] Loading states display
- [ ] No console errors
- [ ] All UI elements visible and functional

---

## 📋 Test Results Summary

| Test Flow      | Status | Notes |
| -------------- | ------ | ----- |
| Landing Page   | ⏳     |       |
| Email OTP Auth | ⏳     |       |
| Google OAuth   | ⏳     |       |
| Dashboard      | ⏳     |       |
| Settings       | ⏳     |       |
| Error Handling | ⏳     |       |
| Loading States | ⏳     |       |
| Navigation     | ⏳     |       |
| Responsive     | ⏳     |       |
| Styling        | ⏳     |       |
| Security       | ⏳     |       |
| Console Check  | ⏳     |       |

---

## 🚨 Issues Found

Document any issues here:

```
Issue 1:
Description:
Expected:
Actual:
Steps to Reproduce:

Issue 2:
...
```

---

## 📝 Testing Notes

```
Add any additional notes, observations, or recommendations here:



```

---

## ✍️ Test Completion

**Date Tested:** ****\_\_\_****
**Tester Name:** ****\_\_\_****
**Browser Used:** ****\_\_\_****
**Device:** ****\_\_\_****
**Overall Status:** ✅ PASS / ❌ FAIL

**Sign Off:**
Tester Signature: ****\_\_\_****

---

**Next Steps:**

- [ ] All tests passed, ready for production
- [ ] Issues found, needs fixes
- [ ] More testing needed
- [ ] Other: ****\_\_\_****
