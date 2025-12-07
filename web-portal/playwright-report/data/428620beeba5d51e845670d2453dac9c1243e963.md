# Page snapshot

```yaml
- generic [ref=e5]:
  - heading "VietJusticIA Portal" [level=1] [ref=e6]
  - heading "Lawyer & Admin Login" [level=6] [ref=e7]
  - generic [ref=e8]:
    - generic [ref=e9]:
      - generic [ref=e10]:
        - text: Email or Phone
        - generic [ref=e11]: "*"
      - generic [ref=e12]:
        - textbox "Email or Phone" [active] [ref=e13]
        - group:
          - generic: Email or Phone *
    - generic [ref=e14]:
      - generic:
        - text: Password
        - generic: "*"
      - generic [ref=e15]:
        - textbox "Password" [ref=e16]
        - group:
          - generic: Password *
    - button "Login" [ref=e17] [cursor=pointer]
```