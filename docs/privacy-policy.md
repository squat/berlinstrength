# Privacy Policy

Berlin Strength doesn't store any data, period.

The application uses the Google OAuth process to authenticate you and generate a token to access the following data from your Google account:
* _email address_: your email address is used to login to the application and authenticate against a whitelist; no email addresses or other identifying information is ever stored or shared
* _Google Drive_: the token is used to securely contact the Google Drive API to list the available files in your Google Drive; the application uses this list to allow you to select which Google Sheet to use as a database; the application also uses the token to create a folder in your Google Drive where it will upload photos you choose; no Google Drive data is ever stored or shared
* _Google Sheets_: the token is used to securely contact the Google Sheets API to read, edit, and append new rows only to the selected Google Sheet; no Google Sheets data is ever stored or shared

While you are logged into the application, the Google token is maintained in the application's volatile memory; it is never stored or saved by the application. As soon as you logout, the application destroys your token and it can no longer access your Google data. Furthermore, no Google data is ever logged by the application.
