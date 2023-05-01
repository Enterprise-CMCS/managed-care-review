# How FileUpload works on MC-Review

## Introduction

MC-Review allows users to upload and save files through multiple workflows. FileUpload the main reusable component for file uploads in the application. It supports multiple files at a time via user select or drag and drop.

Currently, the component is embedded inside several larger forms in our application. The document files supported in MC-Review are text based documents (we support  PDF, CSV, DOC, DOCX, XLS, XLSX, XLSM).

## FileUpload 101

### FileUpload is two pieces of user interface that live close together

- **A file input.** The input can be triggered by click or by drag and drop with a valid file.
The look and feel of the file input [draws directly from USWDS](https://designsystem.digital.gov/components/file-input/) (via the [shared component exported by react-uswds](https://github.com/trussworks/react-uswds/tree/main/src/components/forms/FileInput)).
- **A file list.** This is the UI that shows up below the input. It is custom built for MC-Review. There are currently two variations of the file list that are supported - a HTML table and an HTML unordered list.

### FileUpload has three main functions

- it coordinates between the input and the file list UI
- it keeps the React state file list up to data from async AWS S3 requests
- it communicates the overall state of files and any errors to the parent form component (which will display additional validation messages to the user when the form is in validation state)

## Expected behavior

A text summary of the expected behavior and the error states are below.

### Happy path

- **The  user selects or drops a file.** As soon as the user takes action, the application starts uploading the file to  AWS S3 in the background. The loading indicator is displayed.
- **The file is uploading.** As the file uploads there is progress summary text for the entire file list that is displayed e.g. (4 files added. 1 uploading, 1 scanning, 1 complete, 1 error). The user can delete the file from the list at any time. When the user deletes a file, we delete from S3 if it has been uploaded (unless its a file that’s already part of the system of record  because it was previously submitted).
- **The file is scanning.** After upload succeeds,  scanning begins automatically in AWS S3. The scanning indicator is displayed.
- **The file processing is complete.** When scanning is successful (we use polling on the backend to determine if scanning is finished), we update the file item one final time in the list. That row will display as completed.
- **The file reference is saved in the database**. When the user hits “continue” or “save as draft”  on the form, we store a reference to that file in the submission.

### Possible error paths

- The user selects or drops a file.
  - If the user tries to drop a `.png` or some other unsupported image type, an **invalid file type error** displays.
  - If the user selects or drops a file that is already present in the list, we display a **duplicate file error**.
- The file is uploading. If uploading fails, we display an **upload failed error**.
- The file is scanning. If scanning fails, we display a **scanning failed error**.
- The user tries to hit “continue”.
  - If scanning or uploading is not completed, we display a you must **wait to finish loading error**
  - If there is a duplicate name error or some other error present on any file in the list, we display a **remove documents with issues** error.
- It is possible for the user to have multiple types of errors in combination since we allow multiple files to be added at a time.

### Limitations

- FileUpload UI is optimized for a small list of files. For a larger number of files (15+) we likely want to move to a different UI. 
  - This was explored in design iteration during the first year of the project. Options considered included a pop up toast menu that handles file upload outside the form (similar to Google Docs experience) and a file management page (similar to Box) with a large table or card view where users upload file, address any issues, and organize files outside the form.
- Validations introduce complexity to the parent form component.  
  - FileUpload related validations are hard to test and can overload form pages. The longest most complex tests in the codebase relate to forms where there are multiple file uploads (rates details- where multiple rate upload components may be loaded). This leads to performance issues and clunky UI since the user could be far scrolled down in the form but be blocked by async file error that just appeared higher up on the form outside the viewport.
- Difficult to load and performance test. We don’t currently have an easy way to see how the FileUpload would handle 20 large files on a low bandwidth connection, for example.
- Slow overall upload/scan time (~30 seconds per file from user select to file complete). This impacts user experience as well as end to end and manual testing. Some of the slowness comes from our inherited tooling and could be addressed with tech effort.

## FileUpload technical deep dive

### All about file storage

All user uploaded files in MC-Review are stored in AWS S3. We have multiple buckets for the different types of files, currently ‘HEALTH_PLAN_DOCS’ and `QUESTION_ANSWER_DOCS`. Files can be accessed on the client side with the AWS Amplify functions (encapsulated in `S3Amplify.tsx` and `S3Context.tsx`) and on the server side we use the AWS S3 SDK directly.

There are likely many more files in S3 than what is viewable in MC-Review (for example, if something was uploaded but the user never finishes the form, it will become abandoned). The source of truth, then, for files for MC-Review should be the database which stores files with their associated metadata (s3URL, file name, sha, as well as document categories or other relationships). This data can be used for document related queries.

### Main entrypoint: `FileUpload/FileUpload.tsx`

- This component is made up of a file input, file list, and some headings and hint text used to display messages to user.  The component accepts props that determine whether to display that list in a table or not and what actions should happen on scan, upload, delete etc.
- Responsible for tracking the overall list of file items in React state. As files change,  due to user interaction or async requests resolving, the display of files changes.
- Responsible for async file upload to S3 and displaying inline errors per file.
- Ideally this component is agnostic to file type and business logic related to the type of file being uploaded. This would keep the component re-usable for any type of file needed in the application (e.g. even something like uploading a staff photo for an user avatar could be handled by this same UI if we keep business logic isolated).
- We don't really consider the file "complete" until its been uploaded and scanned. A file that is not complete will not be included in API requests to save a form with FileUpoad in use.
- The underlying file input (HTML `<input type=file/>`) is a rare example in our codebase of a [controlled component](https://react.dev/learn/sharing-state-between-components#controlled-and-uncontrolled-components). We use a [`ref`](https://react.dev/learn/manipulating-the-dom-with-refs#when-react-attaches-the-refs) to access files in the input and clears the input's `value` after each change. This is not standard behavior for an HTML input (usually when you drop something in the input `value` it stays there). However, this allows us to takeover control handling of files for the file items list and the underlying form in relation input.

### Related files and subcomponents

#### `useFileUpload.tsx`

- React hook. Can be used with FileUpload (but is not required).
- Surfaces `fileItemsUpdate`  function -  this is used by parent components to attach validations and side effects
- Surfaces `cleanFileItemsBeforeSave` function  - can be used parent components to double check the React state has not file items in invalid state and remove any mal-formatted items.
- Responsible for determining form level error message in response to FileUpload state.
- **Why use a hook with FileUpload?** Data binding in React in one way parent to child. In our case, the parent is a form ( something like `RateDetails.tsx` or `ContractDetails.tsx` which uses FileUpload and submits data from the component to the API when the form is complete). These parent components need to latch into the changing data to display form level validations if the user tries to continue or go back before file uploads are complete. A hook gives us a way to latch surface data back to the parent and re-use that behavior across the application. You could also achieve with adding state individually to each parent.

#### `ListWrapper.tsx` and `TableWrapper.tsx`

- This is the first UI layer for the files list. UI for the list of file as a whole - this is attached right under the file input

#### `FileProcessor.tsx`

- This file handles core logic around updating file items. Both the ListWrapper and the TableWrapper render this controller component It determines whether to display items  within a HTML list item element `<li>` or table row `<tr>`

#### `FileRow.tsx` and `FileListItem.tsx`

- This is the second UI layer for the files list. It provides the UI for a single file item row.
