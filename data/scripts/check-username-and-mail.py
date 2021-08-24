#!/usr/bin/python3
#-*- coding: UTF-8 -*-

import subprocess

EXPECTED_MAIL_DOMAIN = "robotics-erlangen.de"
ALLOWED_MAIL_ADRESSES = ["info@robotics-erlangen.de"]
EXTERNAL_CONTRIBUTORS = ["Dawid Kulikowski"]

# umlaut translation
translationTable = { ord('ä'): 'ae', ord('ö'): 'oe', ord('ü'): 'ue', ord('ß'): 'ss', ord('é'): 'e' }

process = subprocess.Popen(["git", "log", "-10", "--pretty=format:'%an|%ae'"], stdout=subprocess.PIPE)
for line in iter(process.stdout.readline, b''):
    decoded = line.decode("utf-8").replace("'", "").replace("\n", "")
    username = decoded.split("|")[0]
    origUser = username
    if origUser in EXTERNAL_CONTRIBUTORS:
        continue

    # replace umlaute in username
    username = username.lower().translate(translationTable)

    email = decoded.split("|")[1]

    if email in ALLOWED_MAIL_ADRESSES:
        continue

    # compute expected mail from username
    prefix = username.replace(" ", ".")
    expectedMail = prefix + "@" + EXPECTED_MAIL_DOMAIN
    if expectedMail != email.lower():
        print("Git author " + origUser + " or mail " + email + " does not conform to the standard!")
        exit(1)
