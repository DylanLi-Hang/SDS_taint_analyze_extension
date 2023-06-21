# Single C File Taint Path Annotate

This vscode extension uses [SVF Framework](https://github.com/SVF-tools/SVF) and according to the [teaching materials](https://github.com/SVF-tools/Teaching-Software-Analysis) to create the vscode extension which can highlight the taint path of single .c file.

## Features

> It reads SrcSnk.txt which include $source$ and $sink$, {cFilename}.c which is the source code that needs to be analyzed. It will automatically generates llvm ir file {cFilename}.ll and taint.txt which contains the taint path with SVF.

## Requirements

MacOS or Linux system installed llvm compiler. The extension will use `clang -S -emit-llvm -O0 -g ${sourceFile} -o ${outputIRFile}` to compile the `.c` file into llvm ir file, and then can be analyzed with SVF.

## Extension Settings

It currently supports two commands:

```json
{
    "command": "extension.highlightTaintedPathsText",
    "title": "Highlight Tainted Paths From txt File"
},
{
    "command": "extension.highlightTaintedPaths",
    "title": "Analyze and Then Highlight Tainted Paths From C File"
}
```

- **highlightTaintedPaths** works on the currently opened `.c` file, and it also requires a `SrcSnk.txt` file in the same directory with `.c` file. The extension should generate a `.ll` file which is llvm ir file, and `taint.txt` which contains the taint path of the  C code file.

  - The folder of your code to analyze:

      ```
      code folder/
      ├─ code_to_analyze.c
      ├─ SrcSnk.txt
      ```

  - After running the command, you folder should be:

    ```
    code folder/
    ├─ code_to_analyze.c
    ├─ SrcSnk.txt
    ├─ taint.txt
    ├─ code_to_analyze.ll
    ```
  The extension should generate two files, and annotate the code with `taint.txt`.

- **highlightTaintedPathsIR** annotate current opened `.c` file with *exsisted* `cFilename.txt` which contains same content with `taint.txt`. It won't perform code analyze and just simply annotate with given txt file. 
  
  - This command only require .c file and taint.txt
      ```
        code folder/
        ├─ code_to_analyze.c
        ├─ code_to_analyze.txt (same name with your code filename)
      ```
  - Taint path text file format:
     ```
     { ln: 9  cl: 25  fl: test4.c } -->
     { ln: 13  cl: 13  fl: test4.c } -->
     ```

## Known Issues

The bundled binary file only supports Unix like file path. It is created with MacOS, and soon to be tested on Ubuntu.

## Release Notes

### 1.0.0

Initial release of extension.

### 1.0.1

Fix bug: the highlight should be processed after the taint.txt file generates.
