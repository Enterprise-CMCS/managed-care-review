# How FileUpload works on MC-Review

## Introduction

MC-Review allows users to upload and save files through multiple workflows. FileUpload is the main reusable form field component for this purpose. It supports multiple files at a time via user select or drag and drop.

Currently, the component is embedded inside several larger forms in our application. The file types supported in MC-Review are text based documents (PDF, CSV, DOC, DOCX, XLS, XLSX, XLSM).

## FileUpload 101

### FileUpload is two pieces of user interface that live close together

- **A file input.** The input can be triggered by click or by drag and drop with a valid file.
The look and feel of the file input [draws directly from USWDS](https://designsystem.digital.gov/components/file-input/) (via the [shared component exported by react-uswds](https://github.com/trussworks/react-uswds/tree/main/src/components/forms/FileInput)).
- **A file list.** This is the UI that shows up below the input once the file is dropped. It is custom built for MC-Review. There are currently two variations of the file list that are supported - an HTML table and an HTML unordered list.

### FileUpload has three main functions

- it coordinates between the file input and the file list UI
- it keeps the file list stored in React state up to date with async AWS S3 requests
- it communicates the overall state of files and any errors

## Expected behavior

A text summary of FileUpload expected behavior and error states is included below. See also: [Accessibility Design Patterns](https://qmacbis.atlassian.net/wiki/spaces/OY2/pages/edit-v2/2894299137) in Confluence.

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

- Optimized for a small list of files. For a larger number of files (15+) we likely want to move to a different UI. 
  - This was explored in design iteration during the first year of the project. Options considered included a pop up toast menu that handles file upload outside the form (similar to Google Docs experience) and a file management page (similar to Box) with a large table or card view where users upload files, address any issues, and organize files outside the form.
- Introduces complexity to the parent (page-level) component.  
  - FileUpload validations can overload form pages. This leads to performance and UX issues. For example, the user could be scrolled down in the form but be blocked by an async file error that appears suddenly in a FileUpload higher up on the form. A sighted user could miss this notification since it would be outside the viewport.
- Difficult to load and performance test.
  -  We don’t currently have an easy way to see how the FileUpload would handle 20 large files on a low bandwidth connection, for example. In addition, the longest and most complex tests in the codebase relate to forms where there are multiple file uploads (e.g. rates details with multi-rate submissions). 
- Slow overall upload/scan time.
  - It currently takes ~30 seconds per file from user select to file complete. Slow real time feedback on uploads impacts user experience as well as end to end and manual testing. Some of the slowness comes from our inherited tooling and could be addressed with tech effort.

## FileUpload technical deep dive

### All about file storage

All user uploaded files in MC-Review are stored in AWS S3. We have multiple buckets for the different types of files, currently ‘HEALTH_PLAN_DOCS’ and `QUESTION_ANSWER_DOCS`. Files can be accessed on the client side with the AWS Amplify functions (encapsulated in `S3Amplify.tsx` and `S3Context.tsx`) and on the server side we use the AWS S3 SDK directly.

There are likely many more files in S3 than what is viewable in MC-Review (for example, if something was uploaded but the user never finishes the form, it will become abandoned). The source of truth, then, for files for MC-Review should be the database which stores files with their associated metadata (s3URL, file name, sha, as well as document categories or other relationships). This data can be used for document related queries.

### Main entrypoint: `FileUpload/FileUpload.tsx`

- This component is made up of a file input, file list, and some headings and hint text used to display messages to the user.  The component accepts props that determine whether to display that list in a table or not and what actions should happen on scan, upload, delete etc.
- Responsible for tracking the overall list of file items in React state. As files change,  due to user interaction or async requests resolving, the display of files changes.
- Responsible for async file upload to S3 and displaying inline errors per file.
- Ideally this component is agnostic to file type and business logic related to the type of file being uploaded. This would keep the component re-usable for any type of file needed in the application (e.g. even something like uploading a staff photo for an user avatar could be handled by this same UI if we keep business logic isolated).
- We don't really consider the file "complete" until its been uploaded and scanned. A file that is not complete will not be included in API requests to save a form with FileUpoad in use.
- The underlying file input (HTML `<input type=file/>`) is a rare example in our codebase of a [controlled component](https://react.dev/learn/sharing-state-between-components#controlled-and-uncontrolled-components). We use a [`ref`](https://react.dev/learn/manipulating-the-dom-with-refs#when-react-attaches-the-refs) to access files in the input and clear the input's `value` after each change. This is not standard behavior for an HTML input (usually when you drop something in the input `value` it stays there). However, this allows us to takeover control of handling of files for the file items list and the underlying form in relation to input.

### Related files and subcomponents

#### `useFileUpload.tsx`

- React hook. Can be used with FileUpload (but is not required).
- Surfaces `fileItemsUpdate`  function -  this is used by parent components to attach validations and side effects
- Surfaces `cleanFileItemsBeforeSave` function  - can be used by parent components to double check that the React state does not have file items in an invalid state and remove any mal-formatted items.
- Responsible for determining form level error message in response to FileUpload state.
- **Why use a hook with FileUpload?** Data binding in React is one way parent to child. In our case, the parent is a form page ( something like `RateDetails.tsx` or `ContractDetails.tsx` which uses FileUpload and submits data from the component to the API when the form is complete). These parent components need to latch into the changing data to display form level validations if the user tries to continue or go back before file uploads are complete. A hook gives us a way to latch surface data back to the parent and re-use that behavior across the application. You could also achieve this by adding state individually to each parent.

#### `ListWrapper.tsx` and `TableWrapper.tsx`

- This is the first UI layer for the files list. UI for the list of files as a whole - this is attached right under the file input

#### `FileProcessor.tsx`

- This file handles core logic around updating file items. Both the ListWrapper and the TableWrapper render this controller component. It determines whether to display items within an HTML list item element `<li>` or table row `<tr>`

#### `FileRow.tsx` and `FileListItem.tsx`

- This is the second UI layer for the files list. It provides the UI for a single file item row.
