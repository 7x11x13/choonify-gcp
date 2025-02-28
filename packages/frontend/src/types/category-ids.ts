import { t } from "i18next";

export function getCategoryIdData() {
  return [
    { value: "1", label: t("types.categories.film-and-animation") },
    { value: "2", label: t("types.categories.autos-and-vehicles") },
    { value: "10", label: t("types.categories.music") },
    { value: "15", label: t("types.categories.pets-and-animals") },
    { value: "17", label: t("types.categories.sports") },
    { value: "19", label: t("types.categories.travel-and-events") },
    { value: "20", label: t("types.categories.gaming") },
    { value: "22", label: t("types.categories.people-and-blogs") },
    { value: "23", label: t("types.categories.comedy") },
    { value: "24", label: t("types.categories.entertainment") },
    { value: "25", label: t("types.categories.news-and-politics") },
    { value: "26", label: t("types.categories.howto-and-style") },
    { value: "27", label: t("types.categories.education") },
    { value: "28", label: t("types.categories.science-and-technology") },
    { value: "29", label: t("types.categories.nonprofits-and-activism") },
  ];
}
