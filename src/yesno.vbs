Set objArgs = WScript.Arguments
WScript.StdOut.WriteLine MsgBox(objArgs(1), vbYesNo OR vbQuestion, objArgs(0))