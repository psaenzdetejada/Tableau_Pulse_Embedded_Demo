# Tableau_Pulse_Embedded_Demo
First approach to a fully customized Tableau Pulse embedded and customized experience

## Requirements and trial instructions
1. Download and save all the files in a local folder.
2. Unzip the file node_modules.zip and extract all the content inside a subfolder named "node_modules".
3. Install using the command line the following modules:
   - npm intall express -s
   - npm install cors
   - npm install axios
4. Set up a Connected App in Tableau Cloud.
5. Enable the Connected App
6. Edit the index.js file in Visual Code or other aplication and specify the following const values (all values should be between double quotes):
   - tableauUrl: the URL of the Tableau Site Pod you want to connect to. For example: "https://10ax.online.tableau.com"
   - siteName: Tableau Cloud Site Name. For example: "mySite"
   - userName: Tableau Cloud's username. Normally the email address the user uses to log in Tableau Cloud. 
   - caClientId: Tableau Cloud Connected App Client ID created in step 4.
   - caSecretId: Tableau Cloud Connected App Secret ID created in step 4.
   - caSecretValue: Tableau Cloud Connected App Secret Value created in step 4.
7. With the index.js file open in Visual Code Studio, open a Terminal view (top View menu > Terminal).
8. Run the command Node index.
9. Open the index.html file in a browser and wait a 10-20 seconds. The data should load.
10. Update the styles.css file to change look & feel and the index.html to change personal image or text as required.
