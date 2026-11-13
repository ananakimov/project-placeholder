import type { UploadFile } from "@/components/UploadFiles";

// Файлы приложенного синтетического комплекта; контрольные ответы не входят в загрузку.
export const SAMPLE_FILES = [
  {
    "name": "01_Карточка_учета_фактических_затрат_этап_3.pdf",
    "size": 195333,
    "sha256": "8f90f7ee2ca41da9ddb558ff4d3f76bd6e7c0657522df0268c23ca0819ceb1dc"
  },
  {
    "name": "02_01_Ведомость_ЗП_Январь_2027.xlsx",
    "size": 5321,
    "sha256": "7eb8ddbf5a3c2520a9a214ccfd8afebc3b9db5f10ad316c5590a958eb304be9d"
  },
  {
    "name": "02_02_Ведомость_ЗП_Февраль_2027.xlsx",
    "size": 5322,
    "sha256": "940e79aa6c73c44269d3aa33a15448278891812e62787098e27778ef58f2deda"
  },
  {
    "name": "02_03_Ведомость_ЗП_Март_2027.xlsx",
    "size": 5320,
    "sha256": "8228583bbd8898675d934bb4d5f0f5193487b2ada2f9e62671a42e1db1fb6d51"
  },
  {
    "name": "02_04_Ведомость_ЗП_Апрель_2027.xlsx",
    "size": 5319,
    "sha256": "770012342cbcfe2faabf92a69d461bf80e4bd8cb47cb75ba2836457c93312074"
  },
  {
    "name": "02_05_Ведомость_ЗП_Май_2027.xlsx",
    "size": 5320,
    "sha256": "fefe90c870e5192adc6cfc31c28f8ceb46aff900b5d9ef43fc6dbdcd004403c5"
  },
  {
    "name": "03_01_Страховые_взносы_Январь_2027.xlsx",
    "size": 5200,
    "sha256": "cc48ec613af01cc57d440a826e80fccfe31118b921277d176be1ae3955474e78"
  },
  {
    "name": "03_02_Страховые_взносы_Февраль_2027.xlsx",
    "size": 5205,
    "sha256": "9f9ad3a7521ff6ac07840579981f23afa74e2556047240f9e7f1d11df862d5fa"
  },
  {
    "name": "03_03_Страховые_взносы_Март_2027.xlsx",
    "size": 5198,
    "sha256": "2818d3d169537a1b69ec14d440ffb28534dde0f89ce16a66e194a44ed1d37871"
  },
  {
    "name": "03_04_Страховые_взносы_Апрель_2027.xlsx",
    "size": 5202,
    "sha256": "9084ba7ae21a555e8f288e1f4d1c0019850cb267eba3d09c079772fd63019635"
  },
  {
    "name": "03_05_Страховые_взносы_Май_2027.xlsx",
    "size": 5198,
    "sha256": "af62c1ccebdb952f5300724d3ba05e37748d5adfdf6163f4c0e0e6894282a097"
  },
  {
    "name": "04_Акт_284_28-01-2027.pdf",
    "size": 116630,
    "sha256": "aedb4f4f3b888b6570dac47c2d077e1d9db25e944db64982b3943b95962051cd"
  },
  {
    "name": "05_Счет-акт_397_25-02-2027.pdf",
    "size": 73827,
    "sha256": "01c9d080aa5e4a1f16fcee4b9de2b5adef6404ee3fe3f977a1ec1d4cb8fa2b2c"
  },
  {
    "name": "06_Служебная_записка_КЛ-84.docx",
    "size": 37474,
    "sha256": "1ca1d54dbc704260c6b051ce18c6e24eeda4c5a382850b184ab27f472389bdfe"
  },
  {
    "name": "07_УПД_0527-92.pdf",
    "size": 74057,
    "sha256": "a905bf53869cc375dc89fb9bddca0611197900806f74ba3ca5d8343d3c4c04fc"
  },
  {
    "name": "08_Акт_ИА-62_31-01-2027.pdf",
    "size": 117066,
    "sha256": "e6de5fb01cdab0206f48c96e88f3466e71486d8198586920fa0bd3d75f8b7eff"
  },
  {
    "name": "09_Акт_ADM-48_27-02-2027.pdf",
    "size": 73509,
    "sha256": "9230bb150bf6af37b22b701878cc9382907e3f47c161b8a0bce93e937eb0b7e4"
  },
  {
    "name": "10_Акт_ADM-48_копия.pdf",
    "size": 73509,
    "sha256": "9230bb150bf6af37b22b701878cc9382907e3f47c161b8a0bce93e937eb0b7e4"
  },
  {
    "name": "11_Справка_ИТ_03-27.docx",
    "size": 37504,
    "sha256": "4ff48e1a185f8ed8a943acbb24caf34d539f78f029f2ddee61c5ed27451b8b21"
  },
  {
    "name": "12_Акт_связь_0427.png",
    "size": 125199,
    "sha256": "cb33e1dab0155ac4bfc76b5f0cdf0de38bd7fcd6f9967732c831ffd70a863721"
  },
  {
    "name": "13_УПД_УПР-83.pdf",
    "size": 73274,
    "sha256": "74e0902dc57750dce05c846652053b76309062a3ef3d8fe77c16a27298cf7745"
  },
  {
    "name": "14_Акт_ОРГ-0604.pdf",
    "size": 73323,
    "sha256": "fa88d05f7d3b8a04e103c91bdd3d094f72accade5f9eb04c84908dd80aa53753"
  },
  {
    "name": "15_Акт_ADM-96_15-05-2027.pdf",
    "size": 90032,
    "sha256": "cfda9e5be6fce55a302c06c237676f5f06734e5b4006342bbb6b0725848709df"
  }
] as const;
export const SAMPLE_REPORT: UploadFile = SAMPLE_FILES[0]!;
export const SAMPLE_DOCS: UploadFile[] = SAMPLE_FILES.slice(1);
